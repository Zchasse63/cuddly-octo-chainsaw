import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import SettingsPage from '@/app/dashboard/settings/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      auth: {
        me: {
          invalidate: vi.fn(),
        },
      },
    }),
    auth: {
      me: {
        useQuery: () => ({
          data: { id: '1', email: 'test@example.com', name: 'Test User' },
          isLoading: false,
          error: null,
        }),
      },
      changePassword: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
    coachDashboard: {
      updateProfile: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
      getNotificationPreferences: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
        }),
      },
      updateNotificationPreferences: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({
        data: { session: { user: { email: 'test@example.com' } } },
        error: null,
      }),
    },
  },
}));

// Mock ThemeProvider
vi.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'light' as const,
    setTheme: vi.fn(),
  }),
}));

describe('SettingsPage', () => {
  it('renders settings page', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });
});
