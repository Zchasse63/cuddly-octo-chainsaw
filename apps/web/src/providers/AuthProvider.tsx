'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Loader } from 'lucide-react';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isMounted,
  });

  const isAuthenticated = !!data?.user;

  // Show full-page loading spinner during initial auth check
  // Only show spinner after mount to avoid SSR mismatch
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-accent-blue mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user: data?.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
