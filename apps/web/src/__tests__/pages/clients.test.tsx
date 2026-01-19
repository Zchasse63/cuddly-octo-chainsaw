import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClientsPage from '@/app/dashboard/clients/page';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      getClientList: {
        useQuery: () => ({
          data: { clients: [], totalCount: 0 },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

describe('ClientsPage', () => {
  it('renders clients page', () => {
    render(<ClientsPage />);
    // Check for the "Add Client" button which is always present
    expect(screen.getByRole('button', { name: /add client/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ClientsPage />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });
});
