import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createContext } from './apps/backend/src/trpc/index.js';
import { appRouter } from './apps/backend/src/routers/index.js';

// Simulate an authenticated user context
const mockUser = { id: 'test-user-id', email: 'coach@example.com' };

async function testGetMessages() {
  const caller = appRouter.createCaller({
    user: mockUser,
    db: null, // This would need proper DB instance
  });

  try {
    const result = await caller.coachDashboard.getMessages({
      conversationId: 'test-convo-id',
      limit: 50,
      offset: 0,
    });
    console.log('SUCCESS: getMessages endpoint callable');
    console.log('Response structure:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testGetMessages();
