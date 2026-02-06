import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgramsPage from '@/app/dashboard/programs/page';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      getProgramTemplates: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

describe('ProgramsPage', () => {
  it('renders programs page', () => {
    render(<ProgramsPage />);
    expect(screen.getAllByText(/programs/i).length).toBeGreaterThan(0);
  });
});
