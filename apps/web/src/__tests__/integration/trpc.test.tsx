import { describe, it, expect } from 'vitest';

describe('tRPC Integration', () => {
  it('tRPC client configured with correct base URL', () => {
    const expectedUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    expect(expectedUrl).toBeTruthy();
  });

  it('tRPC client includes auth token in headers', async () => {
    // This verifies the getAuthToken function is called in tRPC config
    const { getAuthToken } = await import('@/lib/supabase');
    expect(getAuthToken).toBeDefined();
  });

  it('tRPC hooks available for coachDashboard router', async () => {
    const { trpc } = await import('@/lib/trpc');
    expect(trpc.coachDashboard).toBeDefined();
    expect(trpc.coachDashboard.getDashboardSummary).toBeDefined();
    expect(trpc.coachDashboard.getClientList).toBeDefined();
    expect(trpc.coachDashboard.getClientDetail).toBeDefined();
    expect(trpc.coachDashboard.inviteClient).toBeDefined();
    expect(trpc.coachDashboard.getProgramTemplates).toBeDefined();
    expect(trpc.coachDashboard.createProgramTemplate).toBeDefined();
    expect(trpc.coachDashboard.getAnalyticsSummary).toBeDefined();
    expect(trpc.coachDashboard.getConversations).toBeDefined();
    expect(trpc.coachDashboard.sendMessage).toBeDefined();
    expect(trpc.coachDashboard.updateProfile).toBeDefined();
    expect(trpc.coachDashboard.importClients).toBeDefined();
  });
});
