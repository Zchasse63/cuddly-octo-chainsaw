import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import AnalyticsPage from '@/app/dashboard/analytics/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      getAnalyticsSummary: {
        useQuery: () => ({
          data: { totalClients: 10, averageAdherence: 85, atRiskClients: [] },
          isLoading: false,
          error: null,
        }),
      },
      getWeeklyActivity: {
        useQuery: () => ({
          data: [
            { day: 'Mon', count: 5 },
            { day: 'Tue', count: 8 },
            { day: 'Wed', count: 3 },
            { day: 'Thu', count: 10 },
            { day: 'Fri', count: 6 },
            { day: 'Sat', count: 12 },
            { day: 'Sun', count: 9 },
          ],
          isLoading: false,
          error: null,
        }),
      },
      getTopPrograms: {
        useQuery: () => ({
          data: [
            { name: 'Strength Builder', activeClients: 15, averageAdherence: 0 },
            { name: 'Cardio Program', activeClients: 12, averageAdherence: 0 },
            { name: 'HIIT Training', activeClients: 8, averageAdherence: 0 },
          ],
          isLoading: false,
          error: null,
        }),
      },
      getClientRetention: {
        useQuery: () => ({
          data: [
            { month: 'Aug', retained: 40, churned: 2 },
            { month: 'Sep', retained: 42, churned: 1 },
            { month: 'Oct', retained: 45, churned: 3 },
            { month: 'Nov', retained: 48, churned: 2 },
            { month: 'Dec', retained: 50, churned: 1 },
            { month: 'Jan', retained: 52, churned: 2 },
          ],
          isLoading: false,
          error: null,
        }),
      },
      getAIAnalyticsInsights: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

describe('AnalyticsPage', () => {
  it('renders analytics page', () => {
    renderWithProviders(<AnalyticsPage />);
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
  });

  it('displays active clients metric', () => {
    renderWithProviders(<AnalyticsPage />);
    expect(screen.getAllByText(/active clients/i)[0]).toBeInTheDocument();
  });
});
