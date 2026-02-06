import 'dotenv/config';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import { appRouter } from './routers';
import { createContext } from './trpc';

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'XAI_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment or use localhost for development
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Create HTTP server with CORS
const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req: req as unknown as Request }),
  middleware: cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }),
  onError({ error, path }) {
    console.error(`[tRPC Error] ${path}:`, error.message);
  },
});

// Start server
const httpServer = server.listen(PORT);
console.log(`tRPC Server running on http://localhost:${PORT}`);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
