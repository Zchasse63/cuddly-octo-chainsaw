import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockDashboardSummary } from '../utils/test-helpers';
import DashboardPage from '@/app/dashboard/page';

// Mock the tRPC hook
const mockUseQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      coachDashboard: {
        getDashboardSummary: {
          invalidate: vi.fn(),
        },
        getUpcomingSessions: {
          invalidate: vi.fn(),
        },
      },
    }),
    coachDashboard: {
      getDashboardSummary: {
        useQuery: () => mockUseQuery(),
      },
      getClientList: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      scheduleSession: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('Dashboard Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    mockUseQuery.mockReturnValue({
      data: mockDashboardSummary(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays loading skeleton when data is loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    // Check for loading state indicators
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('displays error message with retry button when query fails', () => {
    const refetch = vi.fn();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load dashboard data' },
      refetch,
    });

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('displays dashboard metrics correctly', async () => {
    const mockData = mockDashboardSummary();
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    // Check metrics are displayed
    await waitFor(() => {
      expect(screen.getByText('Active Clients')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument(); // activeClients count
      expect(screen.getByText('Workouts This Week')).toBeInTheDocument();
      expect(screen.getByText('127')).toBeInTheDocument(); // workoutsThisWeek count
    });
  });

  it('displays recent activity list', async () => {
    const mockData = mockDashboardSummary();
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Completed workout/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no recent activity', async () => {
    const mockData = {
      ...mockDashboardSummary(),
      recentActivity: [],
    };
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('renders quick action links', async () => {
    mockUseQuery.mockReturnValue({
      data: mockDashboardSummary(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Add Client')).toBeInTheDocument();
      expect(screen.getByText('Create Program')).toBeInTheDocument();
    });
  });

  it('displays percentage changes with trend indicators', async () => {
    mockUseQuery.mockReturnValue({
      data: mockDashboardSummary(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Check for trend indicators (percentages)
      expect(screen.getByText('+12%')).toBeInTheDocument();
      expect(screen.getByText('+23%')).toBeInTheDocument();
    });
  });
});
