import 'dotenv/config';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import { appRouter } from './routers';
import { createContext } from './trpc';

const PORT = process.env.PORT || 3001;

// Create HTTP server with CORS
const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req: req as unknown as Request }),
  middleware: cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }),
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
