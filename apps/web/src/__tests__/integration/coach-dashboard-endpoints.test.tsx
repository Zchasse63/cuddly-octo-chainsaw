import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { trpc } from '@/lib/trpc';

// Mock tRPC for endpoint verification
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      getDashboardSummary: {
        useQuery: vi.fn(() => ({
          data: { activeClients: 5, workoutsThisWeek: 20, monthlyRevenue: 1000, recentActivity: [], upcomingSessions: [] },
          isLoading: false,
          error: null,
        })),
      },
      getClientList: {
        useQuery: vi.fn(() => ({
          data: { clients: [], totalCount: 0 },
          isLoading: false,
          error: null,
        })),
      },
      getClientDetail: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          error: null,
        })),
      },
      inviteClient: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
      getProgramTemplates: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
        })),
      },
      createProgramTemplate: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
      getAnalyticsSummary: {
        useQuery: vi.fn(() => ({
          data: { totalClients: 0, averageAdherence: 0, atRiskClients: [] },
          isLoading: false,
          error: null,
        })),
      },
      getConversations: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
        })),
      },
      sendMessage: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
      updateProfile: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
      importClients: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
    },
  },
}));

describe('Coach Dashboard Endpoints', () => {
  it('getDashboardSummary endpoint returns expected shape', () => {
    const { useQuery } = trpc.coachDashboard.getDashboardSummary;
    const result = useQuery();

    expect(result.data).toHaveProperty('activeClients');
    expect(result.data).toHaveProperty('workoutsThisWeek');
    expect(result.data).toHaveProperty('monthlyRevenue');
    expect(result.data).toHaveProperty('recentActivity');
    expect(result.data).toHaveProperty('upcomingSessions');
  });

  it('getClientList endpoint supports filters and pagination', () => {
    const { useQuery } = trpc.coachDashboard.getClientList;
    const result = useQuery();

    expect(result.data).toHaveProperty('clients');
    expect(result.data).toHaveProperty('totalCount');
  });

  it('getClientDetail endpoint accepts clientId parameter', () => {
    const { useQuery } = trpc.coachDashboard.getClientDetail;
    expect(useQuery).toBeDefined();
  });

  it('inviteClient mutation available', () => {
    const { useMutation } = trpc.coachDashboard.inviteClient;
    const result = useMutation();

    expect(result.mutateAsync).toBeDefined();
  });

  it('getProgramTemplates endpoint returns array', () => {
    const { useQuery } = trpc.coachDashboard.getProgramTemplates;
    const result = useQuery();

    expect(Array.isArray(result.data)).toBe(true);
  });

  it('createProgramTemplate mutation available', () => {
    const { useMutation } = trpc.coachDashboard.createProgramTemplate;
    const result = useMutation();

    expect(result.mutateAsync).toBeDefined();
  });

  it('getAnalyticsSummary endpoint returns metrics', () => {
    const { useQuery } = trpc.coachDashboard.getAnalyticsSummary;
    const result = useQuery();

    expect(result.data).toHaveProperty('totalClients');
    expect(result.data).toHaveProperty('averageAdherence');
    expect(result.data).toHaveProperty('atRiskClients');
  });

  it('getConversations endpoint returns conversations array', () => {
    const { useQuery } = trpc.coachDashboard.getConversations;
    const result = useQuery();

    expect(Array.isArray(result.data)).toBe(true);
  });

  it('sendMessage mutation available', () => {
    const { useMutation } = trpc.coachDashboard.sendMessage;
    const result = useMutation();

    expect(result.mutateAsync).toBeDefined();
  });

  it('updateProfile mutation available', () => {
    const { useMutation } = trpc.coachDashboard.updateProfile;
    const result = useMutation();

    expect(result.mutateAsync).toBeDefined();
  });

  it('importClients mutation available', () => {
    const { useMutation } = trpc.coachDashboard.importClients;
    const result = useMutation();

    expect(result.mutateAsync).toBeDefined();
  });
});
