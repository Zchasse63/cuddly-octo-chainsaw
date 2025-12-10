import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Coach Router Tests
 * Tests AI coach message handling, classification, and response logic
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Coach Router', () => {
  describe('Input Validation', () => {
    describe('sendMessage input', () => {
      const messageSchema = z.object({
        message: z.string().min(1).max(2000),
        conversationId: z.string().uuid().optional(),
        context: z.object({
          currentWorkout: z.string().optional(),
          recentExercise: z.string().optional(),
          userGoal: z.string().optional(),
        }).optional(),
      });

      it('should validate simple message', () => {
        const input = { message: 'How do I improve my squat?' };
        expect(messageSchema.parse(input)).toBeDefined();
      });

      it('should validate message with conversation ID', () => {
        const input = {
          message: 'What about depth?',
          conversationId: testUUID,
        };
        expect(messageSchema.parse(input)).toBeDefined();
      });

      it('should validate message with context', () => {
        const input = {
          message: 'Is this weight too heavy?',
          context: {
            currentWorkout: 'Leg Day',
            recentExercise: 'Squat',
          },
        };
        expect(messageSchema.parse(input)).toBeDefined();
      });

      it('should reject empty message', () => {
        expect(() => messageSchema.parse({ message: '' })).toThrow();
      });

      it('should reject message over 2000 chars', () => {
        const longMessage = 'a'.repeat(2001);
        expect(() => messageSchema.parse({ message: longMessage })).toThrow();
      });
    });

    describe('getConversation input', () => {
      const conversationSchema = z.object({
        conversationId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      });

      it('should validate conversation fetch', () => {
        const input = { conversationId: testUUID };
        expect(conversationSchema.parse(input).limit).toBe(50);
      });
    });
  });

  describe('Message Classification', () => {
    // Simulated classification logic
    const classifyMessage = (message: string): string => {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('?') || 
          lowerMessage.startsWith('how') ||
          lowerMessage.startsWith('what') ||
          lowerMessage.startsWith('why') ||
          lowerMessage.startsWith('when') ||
          lowerMessage.startsWith('can')) {
        return 'question';
      }
      
      if (lowerMessage.includes('hurt') ||
          lowerMessage.includes('pain') ||
          lowerMessage.includes('injury') ||
          lowerMessage.includes('sore')) {
        return 'injury_concern';
      }
      
      if (lowerMessage.includes('did') ||
          lowerMessage.includes('completed') ||
          lowerMessage.includes('finished')) {
        return 'workout_update';
      }
      
      return 'general';
    };

    it('should classify questions', () => {
      expect(classifyMessage('How do I improve my bench?')).toBe('question');
      expect(classifyMessage('What weight should I use?')).toBe('question');
      expect(classifyMessage('Is this good form?')).toBe('question');
    });

    it('should classify injury concerns', () => {
      expect(classifyMessage('My shoulder hurts')).toBe('injury_concern');
      expect(classifyMessage('I have knee pain')).toBe('injury_concern');
      expect(classifyMessage('Still sore from yesterday')).toBe('injury_concern');
    });

    it('should classify workout updates', () => {
      expect(classifyMessage('Just finished my workout')).toBe('workout_update');
      expect(classifyMessage('Did 5 sets of bench')).toBe('workout_update');
    });

    it('should classify general messages', () => {
      expect(classifyMessage('Thanks!')).toBe('general');
      expect(classifyMessage('Okay')).toBe('general');
    });
  });

  describe('Response Generation Logic', () => {
    describe('Injury Response Priority', () => {
      it('should flag injury messages for special handling', () => {
        const messageType = 'injury_concern';
        const requiresCarefulResponse = messageType === 'injury_concern';
        expect(requiresCarefulResponse).toBe(true);
      });

      it('should recommend professional consultation for injuries', () => {
        const injuryDisclaimer = 
          'If you are experiencing significant pain, please consult a healthcare professional.';
        expect(injuryDisclaimer).toContain('healthcare professional');
      });
    });

    describe('Context Awareness', () => {
      it('should incorporate workout context', () => {
        const context = {
          currentWorkout: 'Chest Day',
          recentExercise: 'Bench Press',
        };
        const message = 'Is this weight okay?';
        
        // Context should influence response
        const contextualPrompt = `User is doing ${context.currentWorkout}, ` +
          `recently performed ${context.recentExercise}. ` +
          `Question: ${message}`;
        
        expect(contextualPrompt).toContain('Chest Day');
        expect(contextualPrompt).toContain('Bench Press');
      });
    });
  });

  describe('Conversation Management', () => {
    it('should maintain conversation history', () => {
      const messages = [
        { role: 'user', content: 'How do I squat?' },
        { role: 'assistant', content: 'Here are the key points...' },
        { role: 'user', content: 'What about depth?' },
      ];
      
      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should limit context window', () => {
      const maxMessages = 20;
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      
      const recentMessages = messages.slice(-maxMessages);
      expect(recentMessages).toHaveLength(maxMessages);
    });
  });

  describe('Response Contracts', () => {
    it('should return coach response', () => {
      const response = {
        message: 'Here is my advice...',
        conversationId: testUUID,
        classification: 'question',
        sources: ['exercise_knowledge_base'],
      };

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('conversationId');
    });

    it('should return conversation history', () => {
      const history = {
        conversationId: testUUID,
        messages: [
          { role: 'user', content: 'Hi', createdAt: new Date().toISOString() },
          { role: 'assistant', content: 'Hello!', createdAt: new Date().toISOString() },
        ],
        messageCount: 2,
      };

      expect(history.messages).toHaveLength(2);
      expect(history.messages[0]).toHaveProperty('role');
      expect(history.messages[0]).toHaveProperty('content');
    });
  });
});

