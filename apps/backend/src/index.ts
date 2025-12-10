import 'dotenv/config';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './routers';
import { createContext } from './trpc';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req: req as unknown as Request }),
  onError({ error, path }) {
    console.error(`[tRPC Error] ${path}:`, error.message);
  },
});

// Start server
const httpServer = server.listen(PORT);
console.log(`🚀 tRPC Server running on http://localhost:${PORT}`);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
