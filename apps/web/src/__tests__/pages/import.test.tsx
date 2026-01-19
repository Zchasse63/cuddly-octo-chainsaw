import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ImportPage from '@/app/dashboard/import/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      importClients: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('ImportPage', () => {
  it('renders import page', () => {
    renderWithProviders(<ImportPage />);
    // Check for the Download Template button which is unique to this page
    expect(screen.getByRole('button', { name: /download template/i })).toBeInTheDocument();
  });
});
