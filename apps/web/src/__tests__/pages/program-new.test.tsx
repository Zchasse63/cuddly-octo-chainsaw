import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import NewProgramPage from '@/app/dashboard/programs/new/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      createProgramTemplate: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
      generateProgramWithAI: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('NewProgramPage', () => {
  it('renders new program form', () => {
    renderWithProviders(<NewProgramPage />);
    // Check for the page title which includes "Program"
    expect(screen.getByText(/Create Program Template/i)).toBeInTheDocument();
  });
});
