import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import NewClientPage from '@/app/dashboard/clients/new/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      coachDashboard: {
        getClientList: {
          invalidate: vi.fn(),
        },
      },
    }),
    coachDashboard: {
      inviteClient: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('NewClientPage', () => {
  it('renders new client form', () => {
    renderWithProviders(<NewClientPage />);
    expect(screen.getByText(/Add New Client/i)).toBeInTheDocument();
  });

  it('renders email input', () => {
    renderWithProviders(<NewClientPage />);
    const emailInputs = screen.getAllByPlaceholderText(/example.com/i);
    expect(emailInputs.length).toBeGreaterThan(0);
  });
});
