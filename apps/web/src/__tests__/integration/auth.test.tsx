import { describe, it, expect } from 'vitest';
import { supabase, getAuthToken } from '@/lib/supabase';

describe('Authentication Integration', () => {
  it('supabase client is initialized', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('getAuthToken function is exported', () => {
    expect(getAuthToken).toBeDefined();
    expect(typeof getAuthToken).toBe('function');
  });

  it('supabase auth methods are available', () => {
    expect(supabase.auth.signInWithPassword).toBeDefined();
    expect(supabase.auth.signUp).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
    expect(supabase.auth.getSession).toBeDefined();
  });

  it('getAuthToken returns a promise', () => {
    const result = getAuthToken();
    expect(result).toBeInstanceOf(Promise);
  });
});
