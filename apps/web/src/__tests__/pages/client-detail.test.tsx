import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ClientDetailPage from '@/app/dashboard/clients/[id]/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      getClientDetail: {
        useQuery: () => ({
          data: null,
          isLoading: true,
          error: null,
        }),
      },
      getAIHealthSummary: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('ClientDetailPage', () => {
  it('renders loading state', () => {
    renderWithProviders(<ClientDetailPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
