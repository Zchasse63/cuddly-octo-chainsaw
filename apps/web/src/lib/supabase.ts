import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if we're in the browser and have valid credentials
export const supabase = (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey)
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null as any;

// Auto-refresh session when client is created
if (supabase && typeof window !== 'undefined') {
  // Listen for auth state changes and auto-refresh tokens
  supabase.auth.onAuthStateChange(async (event: string) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
    }
  });
}

/**
 * Get the current auth token from Supabase session
 * Returns the access token or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (!supabase || typeof window === 'undefined') {
      return null;
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session?.access_token || null;
  } catch (error) {
    console.error('Error in getAuthToken:', error);
    return null;
  }
}
