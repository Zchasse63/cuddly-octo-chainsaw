import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db';
import { conversations, messages } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Conversations Integration Tests - AI chat threads and messages
 * Uses pre-seeded test data from seed-data.ts
 */

describe('Conversations Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  let testConversationId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;
  });

  // No cleanup needed - using pre-seeded data

  describe('Conversation CRUD via Supabase', () => {
    it('should create a conversation', async () => {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'Workout Planning',
          conversation_type: 'general',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      testConversationId = data!.id;
    });

    it('should update conversation title', async () => {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ title: 'Push Day Planning' })
        .eq('id', testConversationId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Push Day Planning');
    });

    it('should archive conversation', async () => {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', testConversationId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.is_archived).toBe(true);

      // Unarchive for further tests
      await supabaseAdmin
        .from('conversations')
        .update({ is_archived: false })
        .eq('id', testConversationId);
    });
  });

  describe('Messages via Supabase', () => {
    it('should add user message', async () => {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          role: 'user',
          content: 'What exercises should I do for chest?',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.role).toBe('user');
    });

    it('should add assistant response', async () => {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          role: 'assistant',
          content: 'For chest, I recommend: bench press, incline dumbbell press, and cable flyes.',
          metadata: {
            tokens_used: 150,
            model: 'grok-3',
            latency_ms: 450,
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.role).toBe('assistant');
    });

    it('should query conversation history', async () => {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', testConversationId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Conversation Queries', () => {
    it('should query user conversations', async () => {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('id, title, conversation_type, is_archived')
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should query messages with conversation join', async () => {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select(`
          id, role, content,
          conversations (id, title)
        `)
        .eq('conversation_id', testConversationId)
        .limit(5);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should update message count', async () => {
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('conversation_id', testConversationId);

      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ message_count: messages?.length || 0 })
        .eq('id', testConversationId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.message_count).toBeGreaterThan(0);
    });
  });
});

