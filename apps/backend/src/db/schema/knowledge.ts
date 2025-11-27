import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// RAG knowledge base (content indexed in Upstash Search)
export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: text('chunk_id').unique().notNull(),
  chunkType: text('chunk_type').notNull(), // 'exercise_guide', 'nutrition', 'recovery', 'program'
  category: text('category'), // 'strength', 'running', 'mobility', 'injury'
  title: text('title'),
  content: text('content').notNull(),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  source: text('source'), // 'internal', 'article_url'
  upstashIndexed: boolean('upstash_indexed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types
export type KnowledgeBaseItem = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBaseItem = typeof knowledgeBase.$inferInsert;
