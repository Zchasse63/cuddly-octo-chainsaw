import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../../../../../backend/src/routers';
import { ToastProvider } from '../../components/ui/Toast';
import { ThemeProvider } from '../../providers/ThemeProvider';

// Create tRPC client for testing
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create a mock tRPC client that returns predefined data
 * @param mockData Object with procedure names as keys and mock responses as values
 */
export function createMockTRPCClient(mockData: Record<string, any> = {}) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:4000/trpc',
        transformer: superjson,
        async headers() {
          return {
            authorization: 'Bearer mock-token',
          };
        },
      }),
    ],
  });
}

/**
 * Create a React Query client for testing
 */
export function createMockQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0, // Don't cache in tests
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides tRPC and QueryClient context
 */
interface ProvidersProps {
  children: ReactNode;
  trpcClient?: ReturnType<typeof createMockTRPCClient>;
  queryClient?: QueryClient;
}

function Providers({ children, trpcClient, queryClient }: ProvidersProps) {
  const mockTrpcClient = trpcClient || createMockTRPCClient();
  const mockQueryClient = queryClient || createMockQueryClient();

  return (
    <trpc.Provider client={mockTrpcClient} queryClient={mockQueryClient}>
      <QueryClientProvider client={mockQueryClient}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * Custom render function that wraps component with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    trpcClient?: ReturnType<typeof createMockTRPCClient>;
    queryClient?: QueryClient;
  }
) {
  const { trpcClient, queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <Providers trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </Providers>
    ),
    ...renderOptions,
  });
}

/**
 * Mock authenticated user data
 */
export function mockAuthUser() {
  return {
    id: 'mock-user-id',
    email: 'coach@test.com',
    role: 'coach' as const,
  };
}

/**
 * Mock user profile data
 */
export function mockUserProfile() {
  return {
    userId: 'mock-user-id',
    name: 'Test Coach',
    tier: 'coach' as const,
    experienceLevel: 'intermediate' as const,
    goals: ['Build Muscle', 'Increase Strength'],
    bio: 'Test bio',
    coachingSpecialties: ['Strength Training', 'Bodybuilding'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

/**
 * Mock Supabase session token
 */
export function mockAuthToken() {
  return 'mock-jwt-token';
}

/**
 * Mock client data
 */
export function mockClient() {
  return {
    clientId: 'client-1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active' as const,
    tier: 'athlete' as const,
    experienceLevel: 'beginner' as const,
    goals: ['Lose Weight', 'General Fitness'],
    assignedAt: new Date('2024-01-01'),
    acceptedAt: new Date('2024-01-02'),
  };
}

/**
 * Mock dashboard summary data
 */
export function mockDashboardSummary() {
  return {
    activeClients: 42,
    workoutsThisWeek: 127,
    monthlyRevenue: 0,
    recentActivity: [
      {
        id: 'activity-1',
        clientName: 'John Doe',
        action: 'Completed workout',
        timestamp: new Date(),
      },
      {
        id: 'activity-2',
        clientName: 'Jane Smith',
        action: 'Started new program',
        timestamp: new Date(),
      },
    ],
    upcomingSessions: [],
  };
}

/**
 * Mock program template data
 */
export function mockProgramTemplate() {
  return {
    id: 'program-1',
    name: 'Strength Builder',
    description: 'A 12-week program focused on building strength',
    programType: 'strength' as const,
    durationWeeks: 12,
    daysPerWeek: 4,
    isTemplate: true,
    status: 'draft' as const,
    userId: 'mock-user-id',
    createdByCoachId: 'mock-user-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

/**
 * Mock conversation data
 */
export function mockConversation() {
  return {
    id: 'conversation-1',
    clientId: 'client-1',
    clientName: 'John Doe',
    title: 'General Messages',
    latestMessage: 'Hey coach, great workout today!',
    latestMessageAt: new Date(),
  };
}

/**
 * Mock analytics summary data
 */
export function mockAnalyticsSummary() {
  return {
    totalClients: 42,
    averageAdherence: 87,
    atRiskClients: [
      {
        clientId: 'client-2',
        name: 'Jane Smith',
        adherence: 45,
      },
    ],
  };
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(callback: () => boolean | Promise<boolean>, timeout = 1000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await callback()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}
