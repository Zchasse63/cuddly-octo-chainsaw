/**
 * Enhanced AI Coach with RAG (Retrieval Augmented Generation)
 * Uses Upstash Search for knowledge retrieval and exercise cues
 */

import { generateCompletion, streamCompletion, TEMPERATURES } from '../lib/grok';
import { search, cache } from '../lib/upstash';
import { SEARCH_INDEXES } from './searchIndexer';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

// Knowledge retrieval result
export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  chunkType: string;
  score: number;
}

// Exercise cue result
export interface ExerciseCue {
  id: string;
  cueText: string;
  cueType: 'setup' | 'execution' | 'breathing' | 'common_mistake';
  exerciseName: string;
  score: number;
}

// Enhanced coach context with conversation history
export interface EnhancedCoachContext {
  userId: string;
  name?: string;
  experienceLevel?: string;
  goals?: string[];
  injuries?: string[];
  recentPrs?: Array<{ exercise: string; weight: number; reps: number }>;
  currentWorkout?: {
    name?: string;
    exercises?: string[];
    duration?: number;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// RAG-enhanced AI Coach service
export class RagCoachService {
  private db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  /**
   * Retrieve relevant knowledge from the knowledge base
   */
  async getRelevantKnowledge(
    query: string,
    options?: {
      category?: string;
      topK?: number;
      minScore?: number;
    }
  ): Promise<KnowledgeChunk[]> {
    const { category, topK = 5, minScore = 0.3 } = options || {};

    // Check cache first
    const cacheKey = `knowledge:${query}:${category || 'all'}`;
    const cached = await cache.get<KnowledgeChunk[]>(cacheKey);
    if (cached) return cached;

    // Build filter
    const filter = category ? `category = "${category}"` : undefined;

    try {
      const results = await search.query({
        index: SEARCH_INDEXES.KNOWLEDGE_BASE,
        query,
        topK,
        filter,
      });

      const chunks: KnowledgeChunk[] = results
        .filter((r) => r.score >= minScore)
        .map((r) => {
          const data = r.data as Record<string, string>;
          return {
            id: r.id,
            title: data.title || '',
            content: data.content || '',
            category: data.category || '',
            chunkType: data.chunkType || '',
            score: r.score,
          };
        });

      // Cache for 10 minutes
      if (chunks.length > 0) {
        await cache.set(cacheKey, chunks, 600);
      }

      return chunks;
    } catch (error) {
      console.error('Knowledge retrieval error:', error);
      return [];
    }
  }

  /**
   * Get exercise cues for coaching advice
   */
  async getExerciseCues(
    exerciseIdOrName: string,
    options?: {
      cueType?: 'setup' | 'execution' | 'breathing' | 'common_mistake';
      topK?: number;
    }
  ): Promise<ExerciseCue[]> {
    const { cueType, topK = 5 } = options || {};

    // Check cache
    const cacheKey = `cues:${exerciseIdOrName}:${cueType || 'all'}`;
    const cached = await cache.get<ExerciseCue[]>(cacheKey);
    if (cached) return cached;

    // Build filter
    let filter: string | undefined;
    if (cueType) {
      filter = `cueType = "${cueType}"`;
    }

    try {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISE_CUES,
        query: exerciseIdOrName,
        topK,
        filter,
      });

      const cues: ExerciseCue[] = results.map((r) => {
        const data = r.data as Record<string, string>;
        return {
          id: r.id,
          cueText: data.cueText || '',
          cueType: data.cueType as ExerciseCue['cueType'],
          exerciseName: data.exerciseName || '',
          score: r.score,
        };
      });

      // Cache for 30 minutes
      if (cues.length > 0) {
        await cache.set(cacheKey, cues, 1800);
      }

      return cues;
    } catch (error) {
      console.error('Exercise cue retrieval error:', error);
      return [];
    }
  }

  /**
   * Build RAG context from retrieved knowledge
   */
  private buildRagContext(
    knowledge: KnowledgeChunk[],
    cues: ExerciseCue[]
  ): string {
    const parts: string[] = [];

    if (knowledge.length > 0) {
      parts.push('=== KNOWLEDGE BASE ===');
      for (const chunk of knowledge) {
        parts.push(`[${chunk.category}] ${chunk.title}`);
        parts.push(chunk.content);
        parts.push('');
      }
    }

    if (cues.length > 0) {
      parts.push('=== EXERCISE CUES ===');
      for (const cue of cues) {
        parts.push(`[${cue.cueType}] ${cue.exerciseName}: ${cue.cueText}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Generate RAG-enhanced coach response
   */
  async generateResponse(
    question: string,
    context: EnhancedCoachContext
  ): Promise<{
    response: string;
    sources: KnowledgeChunk[];
    cues: ExerciseCue[];
  }> {
    // Detect if question is about a specific exercise
    const exerciseMention = this.extractExerciseMention(question);

    // Retrieve relevant knowledge
    const knowledge = await this.getRelevantKnowledge(question, {
      topK: 3,
    });

    // Retrieve exercise cues if exercise mentioned
    let cues: ExerciseCue[] = [];
    if (exerciseMention) {
      cues = await this.getExerciseCues(exerciseMention, { topK: 3 });
    }

    // Build RAG context
    const ragContext = this.buildRagContext(knowledge, cues);

    // Build user context string
    const userContext = this.buildUserContext(context);

    // Build conversation history
    const conversationContext = context.conversationHistory
      ?.slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate response
    const systemPrompt = this.getEnhancedSystemPrompt();
    const userPrompt = `${userContext}

${ragContext ? `RELEVANT KNOWLEDGE:\n${ragContext}\n` : ''}
${conversationContext ? `RECENT CONVERSATION:\n${conversationContext}\n` : ''}
USER QUESTION: ${question}

Provide a helpful, personalized response. If you use information from the knowledge base, integrate it naturally without citing sources explicitly.`;

    const response = await generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: TEMPERATURES.coaching,
      maxTokens: 600,
    });

    return {
      response,
      sources: knowledge,
      cues,
    };
  }

  /**
   * Stream RAG-enhanced coach response
   */
  async *streamResponse(
    question: string,
    context: EnhancedCoachContext
  ): AsyncGenerator<string> {
    const exerciseMention = this.extractExerciseMention(question);

    // Retrieve in parallel
    const [knowledge, cues] = await Promise.all([
      this.getRelevantKnowledge(question, { topK: 3 }),
      exerciseMention
        ? this.getExerciseCues(exerciseMention, { topK: 3 })
        : Promise.resolve([]),
    ]);

    const ragContext = this.buildRagContext(knowledge, cues);
    const userContext = this.buildUserContext(context);

    const conversationContext = context.conversationHistory
      ?.slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const systemPrompt = this.getEnhancedSystemPrompt();
    const userPrompt = `${userContext}

${ragContext ? `RELEVANT KNOWLEDGE:\n${ragContext}\n` : ''}
${conversationContext ? `RECENT CONVERSATION:\n${conversationContext}\n` : ''}
USER QUESTION: ${question}

Provide a helpful, personalized response.`;

    for await (const chunk of streamCompletion({
      systemPrompt,
      userPrompt,
      temperature: TEMPERATURES.coaching,
      maxTokens: 600,
    })) {
      yield chunk;
    }
  }

  /**
   * Get form tips for a specific exercise
   */
  async getFormTips(exerciseName: string): Promise<{
    setup: string[];
    execution: string[];
    breathing: string[];
    commonMistakes: string[];
  }> {
    const cues = await this.getExerciseCues(exerciseName, { topK: 15 });

    const categorized = {
      setup: [] as string[],
      execution: [] as string[],
      breathing: [] as string[],
      commonMistakes: [] as string[],
    };

    for (const cue of cues) {
      switch (cue.cueType) {
        case 'setup':
          categorized.setup.push(cue.cueText);
          break;
        case 'execution':
          categorized.execution.push(cue.cueText);
          break;
        case 'breathing':
          categorized.breathing.push(cue.cueText);
          break;
        case 'common_mistake':
          categorized.commonMistakes.push(cue.cueText);
          break;
      }
    }

    return categorized;
  }

  /**
   * Answer a specific fitness topic question using RAG
   */
  async answerTopicQuestion(
    question: string,
    category?: string
  ): Promise<{ answer: string; sources: KnowledgeChunk[] }> {
    const knowledge = await this.getRelevantKnowledge(question, {
      category,
      topK: 5,
    });

    if (knowledge.length === 0) {
      return {
        answer:
          "I don't have specific information on that topic in my knowledge base. Let me give you a general answer based on my training.",
        sources: [],
      };
    }

    const ragContext = knowledge
      .map((k) => `${k.title}:\n${k.content}`)
      .join('\n\n');

    const response = await generateCompletion({
      systemPrompt: `You are a knowledgeable fitness coach. Answer the user's question using ONLY the provided knowledge base context. If the context doesn't fully answer the question, say so and provide what you can.`,
      userPrompt: `KNOWLEDGE BASE:\n${ragContext}\n\nQUESTION: ${question}`,
      temperature: TEMPERATURES.analysis,
      maxTokens: 500,
    });

    return {
      answer: response,
      sources: knowledge,
    };
  }

  /**
   * Get personalized exercise recommendations
   */
  async getExerciseRecommendations(
    context: EnhancedCoachContext,
    options: {
      muscleGroup?: string;
      equipment?: string[];
      avoidExercises?: string[];
    }
  ): Promise<string> {
    // Get relevant knowledge about training principles
    const knowledge = await this.getRelevantKnowledge(
      `exercise selection ${options.muscleGroup || ''} ${context.experienceLevel || ''} training`,
      { category: 'strength', topK: 3 }
    );

    const ragContext = this.buildRagContext(knowledge, []);
    const userContext = this.buildUserContext(context);

    const response = await generateCompletion({
      systemPrompt: this.getEnhancedSystemPrompt(),
      userPrompt: `${userContext}

${ragContext ? `RELEVANT KNOWLEDGE:\n${ragContext}\n` : ''}

Recommend 3-5 exercises for ${options.muscleGroup || 'a balanced workout'}.
${options.equipment ? `Available equipment: ${options.equipment.join(', ')}` : ''}
${options.avoidExercises ? `Avoid: ${options.avoidExercises.join(', ')}` : ''}

Provide brief reasoning for each recommendation based on the user's context.`,
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return response;
  }

  /**
   * Save message to conversation history
   */
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db.insert(schema.messages).values({
      conversationId,
      userId: metadata?.userId || '',
      role,
      content,
      metadata,
    });
  }

  /**
   * Get or create conversation for user
   */
  async getOrCreateConversation(
    userId: string,
    contextType?: string,
    contextId?: string
  ): Promise<string> {
    // Check for existing active conversation
    const existing = await this.db.query.conversations.findFirst({
      where: and(
        eq(schema.conversations.userId, userId),
        eq(schema.conversations.isActive, true),
        contextType ? eq(schema.conversations.contextType, contextType) : undefined
      ),
      orderBy: [desc(schema.conversations.updatedAt)],
    });

    if (existing) return existing.id;

    // Create new conversation
    const [conversation] = await this.db
      .insert(schema.conversations)
      .values({
        userId,
        contextType,
        contextId,
        isActive: true,
      })
      .returning();

    return conversation.id;
  }

  // Helper methods

  private extractExerciseMention(text: string): string | null {
    // Common exercise patterns
    const exercisePatterns = [
      /(?:bench|squat|deadlift|press|curl|row|pull[- ]?up|push[- ]?up|lunge|plank)/i,
      /(?:how (?:to|do)|form for|tips for|help with) ([\w\s]+?)(?:\?|$)/i,
    ];

    for (const pattern of exercisePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0];
      }
    }

    return null;
  }

  private buildUserContext(context: EnhancedCoachContext): string {
    const parts = ['USER CONTEXT:'];

    if (context.name) parts.push(`- Name: ${context.name}`);
    if (context.experienceLevel) parts.push(`- Experience: ${context.experienceLevel}`);
    if (context.goals?.length) parts.push(`- Goals: ${context.goals.join(', ')}`);
    if (context.injuries?.length) parts.push(`- Active injuries: ${context.injuries.join(', ')}`);
    if (context.recentPrs?.length) {
      const prStrings = context.recentPrs.map(
        (pr) => `${pr.exercise}: ${pr.weight}lbs x ${pr.reps}`
      );
      parts.push(`- Recent PRs: ${prStrings.join(', ')}`);
    }
    if (context.currentWorkout) {
      parts.push(`- Current workout: ${context.currentWorkout.name || 'In progress'}`);
      if (context.currentWorkout.exercises?.length) {
        parts.push(`  Exercises: ${context.currentWorkout.exercises.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  private getEnhancedSystemPrompt(): string {
    return `You are VoiceFit's AI fitness coach - an expert personal trainer powered by a comprehensive fitness knowledge base.

PERSONALITY:
- Conversational and supportive (use contractions naturally)
- Expert knowledge without being condescending
- Celebrate progress, be constructive on setbacks
- Reference the user's specific situation
- Ask clarifying questions when helpful

EXPERTISE:
- Strength training and hypertrophy
- Program design and periodization
- Exercise form and technique
- Recovery and injury prevention
- Nutrition for performance
- Running and cardio

KNOWLEDGE INTEGRATION:
- Use the provided knowledge base context to give accurate, detailed answers
- Integrate information naturally without explicitly citing sources
- If the knowledge base provides specific cues or tips, share them
- For form questions, emphasize safety and proper technique

CONSTRAINTS:
- Keep responses concise (2-4 sentences) unless detail is requested
- For medical concerns, recommend consulting a professional
- If unsure, acknowledge uncertainty rather than guessing
- Prioritize user safety in all recommendations`;
  }
}

// Factory function
export function createRagCoach(
  db: PostgresJsDatabase<typeof schema>
): RagCoachService {
  return new RagCoachService(db);
}
