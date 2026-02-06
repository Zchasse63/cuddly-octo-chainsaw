# VoiceFit Web Dashboard - Test Implementation Guide

This guide explains how to expand the test suite created during the audit.

## Test Infrastructure Setup ✅

The following infrastructure is already in place:

### 1. Test Configuration
- **Vitest Config:** `apps/web/vitest.config.ts`
- **Setup File:** `apps/web/src/__tests__/setup.ts`
  - Mocks: next/navigation, window.matchMedia, localStorage, Supabase

### 2. Test Utilities
**Location:** `apps/web/src/__tests__/utils/test-helpers.tsx`

**Available Functions:**
```typescript
// Rendering
renderWithProviders(component, options) // Render with tRPC + QueryClient

// Mock Factories
createMockTRPCClient(mockData) // Create tRPC client for tests
createMockQueryClient() // Create React Query client

// Data Mocks
mockAuthUser() // Returns mock user object
mockUserProfile() // Returns mock profile
mockAuthToken() // Returns "mock-jwt-token"
mockClient() // Returns mock client data
mockDashboardSummary() // Returns mock dashboard data
mockProgramTemplate() // Returns mock program
mockConversation() // Returns mock conversation
mockAnalyticsSummary() // Returns mock analytics
```

### 3. Example Test
**Location:** `apps/web/src/__tests__/pages/dashboard-home.test.tsx`

This demonstrates the pattern for testing dashboard pages.

## How to Create Page Tests

### Step 1: Create Test File

```bash
# Page tests location
apps/web/src/__tests__/pages/<page-name>.test.tsx
```

### Step 2: Test Structure Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockDataHelper } from '../utils/test-helpers';
import PageComponent from '@/app/<path>/page';

// Mock the tRPC hook
const mockUseQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      endpointName: {
        useQuery: () => mockUseQuery(),
      },
    },
  },
}));

describe('Page Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    mockUseQuery.mockReturnValue({
      data: mockDataHelper(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<PageComponent />);
    expect(screen.getByText('Page Title')).toBeInTheDocument();
  });

  it('displays loading skeleton', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<PageComponent />);
    // Assert loading state
  });

  it('displays error message', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load' },
      refetch: vi.fn(),
    });

    renderWithProviders(<PageComponent />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('displays data correctly', async () => {
    mockUseQuery.mockReturnValue({
      data: mockDataHelper(),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<PageComponent />);
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

## Remaining Page Tests to Create

### Priority 1: Dashboard Pages (8 files)
1. `clients.test.tsx` - Client list with search/filter
2. `client-detail.test.tsx` - Client detail with workouts/health
3. `client-new.test.tsx` - Multi-step client invite form
4. `analytics.test.tsx` - Analytics with charts
5. `messages.test.tsx` - Messaging interface
6. `programs.test.tsx` - Program template list
7. `program-new.test.tsx` - Program creation form
8. `import.test.tsx` - CSV import workflow

### Priority 2: Auth & Onboarding (4 files)
9. `home.test.tsx` - Landing page
10. `login.test.tsx` - Login form
11. `signup.test.tsx` - Signup form
12. `onboarding.test.tsx` - Multi-step onboarding
13. `settings.test.tsx` - Settings with tabs

## Integration Tests to Create

### 1. tRPC Integration Test
**Location:** `apps/web/src/__tests__/integration/trpc.test.tsx`

**Tests:**
- tRPC client configured with correct URL
- Auth token included in headers
- useQuery hooks fetch data
- useMutation hooks execute mutations
- Error handling for failed requests
- Loading states update correctly

### 2. Coach Dashboard Endpoints Test
**Location:** `apps/web/src/__tests__/integration/coach-dashboard-endpoints.test.tsx`

**Tests (11 endpoints):**
```typescript
describe('coachDashboard.getDashboardSummary', () => {
  it('returns dashboard summary data', async () => {
    // Test implementation
  });
});

describe('coachDashboard.getClientList', () => {
  it('returns filtered client list', async () => {
    // Test implementation
  });
});

// ... 9 more endpoint tests
```

### 3. Authentication Test
**Location:** `apps/web/src/__tests__/integration/auth.test.tsx`

**Tests:**
- Login form submits and sets session
- Signup form creates account
- Protected routes redirect when not authenticated
- getAuthToken() retrieves session token
- Logout clears session
- Auth token refreshes on expiration

### 4. Form Tests
**Location:** `apps/web/src/__tests__/integration/forms.test.tsx`

**Tests:**
- Client invite form validates email
- Program creation form validates required fields
- CSV import form validates file format
- Settings form updates profile
- All forms display validation errors

### 5. Navigation Test
**Location:** `apps/web/src/__tests__/integration/navigation.test.tsx`

**Tests:**
- Navigation between dashboard pages
- Quick action links navigate correctly
- Breadcrumbs display current location
- Back button navigates to previous page

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test dashboard-home

# Run with coverage
npm test -- --coverage

# Watch mode (for development)
npm test -- --watch
```

## Test Coverage Goals

**Target:** 80%+ overall

**By Category:**
- Page files: 80%+
- tRPC hooks: 90%+
- Form components: 85%+
- Utility functions: 90%+

## Common Patterns

### Testing Forms

```typescript
import { fireEvent } from '@testing-library/react';

it('submits form with valid data', async () => {
  const mutate = vi.fn();
  mockUseMutation.mockReturnValue({
    mutate,
    isPending: false,
    error: null,
  });

  renderWithProviders(<FormComponent />);

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'test@example.com' },
  });
  fireEvent.click(screen.getByText('Submit'));

  await waitFor(() => {
    expect(mutate).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });
});
```

### Testing Navigation

```typescript
import { useRouter } from 'next/navigation';

it('navigates to client detail on click', async () => {
  const push = vi.fn();
  vi.mocked(useRouter).mockReturnValue({ push } as any);

  renderWithProviders(<ClientsList />);

  fireEvent.click(screen.getByText('View Profile'));

  expect(push).toHaveBeenCalledWith('/dashboard/clients/client-1');
});
```

### Testing Async Data

```typescript
it('loads and displays async data', async () => {
  mockUseQuery.mockReturnValue({
    data: mockClient(),
    isLoading: false,
    error: null,
  });

  renderWithProviders(<ClientDetail />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Issue: "Cannot find module '@/app/...'"

**Solution:** Check path alias in vitest.config.ts:
```typescript
resolve: {
  alias: {
    '@': '/src',
  },
},
```

### Issue: "window.matchMedia is not a function"

**Solution:** Already mocked in setup.ts. Ensure test imports setup:
```typescript
import '../setup';
```

### Issue: "useRouter is not a function"

**Solution:** Already mocked in setup.ts. For custom behavior:
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
```

### Issue: "ReferenceError: fetch is not defined"

**Solution:** Add fetch polyfill to vitest.config.ts:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

## Best Practices

1. **Clear Mock State:** Use `vi.clearAllMocks()` in `beforeEach()`
2. **Test User Behavior:** Test what users see, not implementation details
3. **Async Handling:** Always use `waitFor()` for async assertions
4. **Error Cases:** Test loading, error, and success states
5. **Accessibility:** Use `getByRole()` and `getByLabelText()` where possible
6. **Isolation:** Each test should be independent
7. **Descriptive Names:** Test names should explain the behavior being tested

## Next Steps

1. **Create remaining page tests** (13 files) - Priority 1
2. **Create integration tests** (5 files) - Priority 2
3. **Add snapshot tests** for complex UI - Optional
4. **Add E2E tests** with Playwright - Future enhancement
5. **Set up CI/CD** to run tests on every commit

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [tRPC Testing](https://trpc.io/docs/client/react/testing)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/vitest)

---

**Last Updated:** 2026-01-19
**Test Suite Status:** Infrastructure complete, 4 test files passing (55 tests)
