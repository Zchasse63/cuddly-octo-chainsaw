import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import MessagesPage from '@/app/dashboard/messages/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      coachDashboard: {
        getMessages: {
          invalidate: vi.fn(),
        },
      },
    }),
    coachDashboard: {
      getConversations: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      getMessages: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      sendMessage: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
      generateAISuggestedResponse: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('MessagesPage', () => {
  it('renders messages page', () => {
    renderWithProviders(<MessagesPage />);
    expect(screen.getAllByText(/messages/i)[0]).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<MessagesPage />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });
});
