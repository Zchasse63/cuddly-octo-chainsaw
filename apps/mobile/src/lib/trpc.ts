import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../backend/src/routers';
import { useAuthStore } from '../stores/auth';

// Create tRPC React hooks
export const api = createTRPCReact<AppRouter>();

// API URL - must be set via EXPO_PUBLIC_API_URL in production
const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  console.warn('[trpc] EXPO_PUBLIC_API_URL not set, falling back to http://localhost:3001. This will not work in production.');
}

// Create tRPC client
export function createTRPCClient() {
  return api.createClient({
    links: [
      httpBatchLink({
        url: API_URL || 'http://localhost:3001',
        transformer: superjson,
        headers() {
          const token = useAuthStore.getState().session?.access_token;
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  });
}

// Export type for use in components
export type { AppRouter };
