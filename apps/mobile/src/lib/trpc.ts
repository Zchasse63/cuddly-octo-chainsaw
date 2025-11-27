import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../backend/src/routers';
import { useAuthStore } from '../stores/auth';

// Create tRPC React hooks
export const api = createTRPCReact<AppRouter>();

// API URL - change for production
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Create tRPC client
export function createTRPCClient() {
  return api.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
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
