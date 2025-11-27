import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { createClient, Session, User } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch {
          console.log('Failed to save to SecureStore');
        }
      },
      removeItem: async (key) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          console.log('Failed to remove from SecureStore');
        }
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Secure storage adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      console.log('Failed to save to SecureStore');
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      console.log('Failed to remove from SecureStore');
    }
  },
};

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        set({ isLoading: true });
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            set({
              user: session.user,
              session,
              isInitialized: true,
              isLoading: false,
            });
          } else {
            set({ isInitialized: true, isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              user: session?.user || null,
              session,
            });
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isInitialized: true, isLoading: false });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
          });

          return { success: true };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signUp: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
          });

          return { success: true };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Sign out error:', error);
          set({ isLoading: false });
        }
      },

      signInWithApple: async () => {
        // Implementation requires native setup
        return { success: false, error: 'Not implemented yet' };
      },

      signInWithGoogle: async () => {
        // Implementation requires native setup
        return { success: false, error: 'Not implemented yet' };
      },

      refreshSession: async () => {
        try {
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session) {
            set({ session, user: session.user });
          }
        } catch (error) {
          console.error('Session refresh error:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        // Only persist minimal data - actual session is in Supabase
        isInitialized: state.isInitialized,
      }),
    }
  )
);
