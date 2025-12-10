# Testing Audit Report

You are a senior QA architect and test engineer conducting a comprehensive testing audit. Your mission is to autonomously analyze this codebase and generate a complete, pragmatic testing strategy that maximizes real-world reliability while minimizing time spent on mock/test configuration issues.

## CRITICAL TESTING PHILOSOPHY

Before proceeding, internalize these principles:

### PRAGMATIC TESTING RULES

1. **Real-World Focus**: Every test should validate behavior that matters in production
2. **Mock Minimalism**: Only mock what you absolutely must (external APIs, time, randomness)
3. **Integration Over Isolation**: Prefer testing real interactions over heavily mocked unit tests
4. **Skip Mock Rabbit Holes**: If a test requires more than 15 minutes of mock configuration, flag it for E2E instead
5. **Test Behavior, Not Implementation**: Tests should survive refactoring
6. **Flaky Test Prevention**: Design tests that pass/fail deterministically

### WHEN TO MOCK (Acceptable)

- External HTTP APIs (use MSW or similar for realistic mocking)
- Time-dependent functions (dates, timers)
- Random value generation
- Third-party services with costs (Stripe, SendGrid, etc.)
- Browser APIs not available in JSDOM (geolocation, etc.)

### WHEN NOT TO MOCK (Avoid These Patterns)

- Internal modules/services (test them together)
- Database interactions (use test database instead)
- State management (test with real store)
- React Context (wrap with real providers)
- Internal API routes (test the actual route)

---

## PHASE 0: AUTONOMOUS DISCOVERY

### Step 1: Identify Testing Infrastructure

Analyze the codebase to determine current testing setup:

**Existing Test Framework:**
- Test runner (Jest, Vitest, Mocha, etc.)
- Assertion library (Jest matchers, Chai, etc.)
- Component testing (React Testing Library, Enzyme, Vue Test Utils, etc.)
- E2E framework (Playwright, Cypress, Puppeteer, etc.)
- API testing tools (Supertest, etc.)

**Current Test Coverage:**
- Existing test files (count and locations)
- Test configuration files (jest.config, vitest.config, playwright.config, etc.)
- Test utilities/helpers already created
- Mock files or fixtures present
- Test scripts in package.json

**Testing Patterns in Use:**
- Naming conventions (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- Test organization (co-located, separate test directory)
- Setup/teardown patterns
- Snapshot testing usage
- Coverage thresholds configured

**Document findings:**

```
TESTING INFRASTRUCTURE DISCOVERY
================================
Test Runner: [framework] [version]
Component Testing: [library]
E2E Framework: [framework] or [NOT CONFIGURED]
Existing Tests: [count] files
Coverage Tool: [tool] or [NOT CONFIGURED]
Current Coverage: [percentage] or [UNKNOWN]

Test Locations:
- Unit/Component: [paths]
- Integration: [paths]
- E2E: [paths]

Existing Utilities:
- [list test helpers, custom matchers, etc.]

Configuration Status:
- Jest/Vitest: [CONFIGURED/NEEDS SETUP]
- E2E: [CONFIGURED/NEEDS SETUP]
- CI Integration: [YES/NO]
```

### Step 2: Identify Tech Stack for Testing Strategy

Analyze to understand what needs testing:

**Frontend Architecture:**
- Framework (React, Vue, Svelte, Next.js, etc.)
- Component library structure
- State management (Redux, Zustand, Context, etc.)
- Routing system
- Form handling (React Hook Form, Formik, etc.)
- Data fetching (React Query, SWR, Apollo, etc.)

**Backend Architecture:**
- Framework (Express, FastAPI, NestJS, etc.)
- API structure (REST, GraphQL, tRPC)
- Authentication system
- Database ORM/client
- Background jobs/queues

**Shared/Critical:**
- TypeScript usage (strong typing helps testing)
- Validation libraries (Zod, Yup, Joi)
- Utility functions
- Business logic modules

### Step 3: Map All Testable Surfaces

Create comprehensive inventory:

**Frontend Testable Units:**

```
COMPONENT INVENTORY
===================
Page Components: [list with paths]
Feature Components: [list with paths]
Shared/UI Components: [list with paths]
Layout Components: [list with paths]
Form Components: [list with paths]
Modal/Dialog Components: [list with paths]
```

**Frontend Testable Behaviors:**

```
BEHAVIOR INVENTORY
==================
User Interactions: [list key interactions]
Form Submissions: [list forms]
Navigation Flows: [list route changes]
State Changes: [list key state transitions]
Async Operations: [list data fetching patterns]
Error States: [list error handling]
```

**Backend Testable Units:**

```
API ENDPOINT INVENTORY
======================
[METHOD] [path] - [purpose]
[METHOD] [path] - [purpose]
...

BUSINESS LOGIC MODULES
======================
[module name] - [responsibility]
...

DATABASE OPERATIONS
===================
[model/table] - [CRUD operations used]
...
```

**Integration Points:**

```
INTEGRATION SURFACE INVENTORY
=============================
Frontend → Backend: [list API integrations]
Backend → Database: [list data operations]
Backend → External APIs: [list third-party calls]
Background Jobs: [list async processes]
```

### Step 4: Identify Critical User Flows for E2E

By analyzing routes, components, and API calls, identify:

```
CRITICAL USER FLOWS (E2E Priority)
==================================
1. [Flow name]: [step-by-step description]
   Entry: [starting point]
   Exit: [success state]
   Critical Because: [business impact]

2. [Flow name]: ...
```

---

## PHASE 1: TEST GENERATION STRATEGY

### SECTION 1: COMPONENT/UNIT TEST PLAN

For each component category, generate specific test cases:

#### 1.1 Page Components

For EACH page component, specify:

```
COMPONENT: [ComponentName]
FILE: [path/to/component]
PRIORITY: [CRITICAL/HIGH/MEDIUM/LOW]

RENDER TESTS:
- [ ] Renders without crashing
- [ ] Displays correct initial state
- [ ] Shows loading state while fetching data
- [ ] Renders error state when data fetch fails
- [ ] [specific content assertions]

INTERACTION TESTS:
- [ ] [specific user action] → [expected result]
- [ ] [specific user action] → [expected result]

INTEGRATION POINTS (test with real providers):
- [ ] Works with real [state management] provider
- [ ] Works with real [routing] context
- [ ] Correctly calls [API hook/service]

SKIP MOCKING (test in E2E instead):
- [ ] [complex interaction better suited for E2E]

SAMPLE TEST STRUCTURE:
```

```typescript
describe('[ComponentName]', () => {
  // Use real providers, not mocks
  const renderComponent = () => {
    return render(
      <RealProviders>
        <ComponentName />
      </RealProviders>
    );
  };

  it('renders initial state correctly', () => {
    // Specific assertions
  });

  it('[user action] results in [expected behavior]', async () => {
    // Specific test
  });
});
```

#### 1.2 Shared/UI Components

For EACH reusable UI component:

```
COMPONENT: [ComponentName]
FILE: [path/to/component]
PRIORITY: [based on usage frequency]

PROPS TESTING:
- [ ] Renders with required props only
- [ ] Renders with all optional props
- [ ] Handles edge case props ([specific cases])

VARIANT TESTING:
- [ ] [variant name] renders correctly
- [ ] [variant name] renders correctly

INTERACTION TESTING:
- [ ] [interaction] fires [callback]
- [ ] [interaction] updates [internal state]

ACCESSIBILITY TESTING:
- [ ] Has correct ARIA attributes
- [ ] Is keyboard navigable
- [ ] Has sufficient color contrast (if applicable)

EDGE CASES:
- [ ] Empty/null content handling
- [ ] Very long content handling
- [ ] [specific edge case]
```

#### 1.3 Form Components

For EACH form:

```
FORM: [FormName]
FILE: [path/to/form]
PRIORITY: [CRITICAL for auth/payment, HIGH for data entry]

VALIDATION TESTS:
- [ ] Shows error for empty required field: [field name]
- [ ] Shows error for invalid format: [field name] with [invalid input]
- [ ] Shows error for [specific validation rule]
- [ ] Clears errors when corrected

SUBMISSION TESTS:
- [ ] Disables submit button while submitting
- [ ] Shows loading state during submission
- [ ] Handles successful submission ([expected behavior])
- [ ] Handles submission error ([expected behavior])

FIELD INTERACTION TESTS:
- [ ] [field] accepts valid input
- [ ] [field] formats input correctly (if applicable)
- [ ] [conditional field] appears when [condition]

DO NOT MOCK:
- Form library internals (test actual validation)
- State management (use real store)

MOCK ONLY:
- API submission (use MSW for realistic network mock)
```

#### 1.4 Custom Hooks

For EACH custom hook:

```
HOOK: [useHookName]
FILE: [path/to/hook]
PRIORITY: [based on usage]

STATE TESTS:
- [ ] Returns correct initial state
- [ ] Updates state correctly when [action]

EFFECT TESTS:
- [ ] Triggers effect when [dependency changes]
- [ ] Cleans up properly on unmount

ERROR HANDLING:
- [ ] Returns error state when [failure condition]

TESTING APPROACH:
- Use @testing-library/react's renderHook
- Test with real dependencies when possible
```

**Sample:**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useHookName } from './useHookName';

describe('useHookName', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.value).toBe(expectedInitial);
  });
});
```

#### 1.5 Utility Functions

For EACH utility module:

```
MODULE: [utilityName]
FILE: [path/to/utility]
PRIORITY: [CRITICAL for business logic, MEDIUM for helpers]

FUNCTION: [functionName]
TEST CASES:
- [ ] [input] → [expected output]
- [ ] [edge case input] → [expected output]
- [ ] [error case] → [expected error/handling]

PURE FUNCTIONS (no mocking needed):
- [list pure functions - straightforward to test]

FUNCTIONS WITH SIDE EFFECTS (mock minimally):
- [function]: mock only [specific external dependency]
```

---

### SECTION 2: INTEGRATION TEST PLAN

Integration tests verify multiple units working together. These use real implementations with minimal mocking.

#### 2.1 API Route Integration Tests

For EACH API endpoint:

```
ENDPOINT: [METHOD] [/api/path]
FILE: [path/to/route]
PRIORITY: [CRITICAL/HIGH/MEDIUM]

TEST DATABASE SETUP:
- Use test database (SQLite in-memory, test PostgreSQL, etc.)
- Seed with: [specific test data needed]
- Clean up: [after each/all tests]

AUTHENTICATION TESTS:
- [ ] Returns 401 when no auth token
- [ ] Returns 403 when insufficient permissions
- [ ] Succeeds with valid auth

REQUEST VALIDATION TESTS:
- [ ] Returns 400 for missing required field: [field]
- [ ] Returns 400 for invalid field: [field] with [invalid value]
- [ ] Accepts valid request body

SUCCESS PATH TESTS:
- [ ] Returns [status code] on success
- [ ] Response body contains [expected fields]
- [ ] Database state is [expected state]
- [ ] [Side effect] occurs (email sent, job queued, etc.)

ERROR PATH TESTS:
- [ ] Returns [status] when [error condition]
- [ ] Does not modify database on error
```

**Sample Structure:**

```typescript
import { createTestServer } from '../test-utils/server';
import { seedTestData, cleanupTestData } from '../test-utils/db';

describe('[METHOD] [/api/path]', () => {
  let server;
  
  beforeAll(async () => {
    server = await createTestServer();
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await server.close();
  });

  it('returns [expected] when [condition]', async () => {
    const response = await server.inject({
      method: '[METHOD]',
      url: '[/api/path]',
      payload: { /* real payload */ },
      headers: { authorization: 'Bearer [test-token]' }
    });
    
    expect(response.statusCode).toBe([expected]);
    expect(response.json()).toMatchObject({ /* expected shape */ });
  });
});
```

```
MOCK ONLY:
- External API calls (use MSW)
- Email sending service
- [Other external services]

DO NOT MOCK:
- Database operations
- Internal services
- Validation logic
```

#### 2.2 Frontend-Backend Integration Tests

For EACH critical frontend feature that calls APIs:

```
FEATURE: [Feature Name]
FRONTEND: [component/hook path]
BACKEND: [api endpoint(s)]
PRIORITY: [CRITICAL/HIGH]

INTEGRATION TEST APPROACH:
Option A: MSW (Mock Service Worker) - Recommended
- Mock API at network level
- Frontend code runs unchanged
- Realistic network behavior (delays, errors)

Option B: Test Database + Real API
- Spin up test server
- Use real database
- True integration (slower, more complex)

TEST CASES:
- [ ] Component loads and fetches data successfully
- [ ] Component displays loading state
- [ ] Component handles API error gracefully
- [ ] User action triggers correct API call
- [ ] Component updates after successful mutation
```

**MSW Setup Example:**

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/[endpoint]', (req, res, ctx) => {
    return res(ctx.json({ /* realistic response */ }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```
AVOID:
- Mocking fetch/axios directly (use MSW instead)
- Mocking internal modules
- Testing API and component separately when integration matters
```

#### 2.3 Database Integration Tests

For EACH critical database operation:

```
OPERATION: [Operation description]
MODEL/TABLE: [model name]
FILE: [repository/service file]
PRIORITY: [CRITICAL for data integrity]

TEST DATABASE STRATEGY:
- [ ] Use: [SQLite in-memory / Test PostgreSQL / MongoDB Memory Server]
- [ ] Migrations run before tests
- [ ] Transactions rolled back after each test (if supported)

TEST CASES:
- [ ] Creates record with valid data
- [ ] Enforces unique constraint on [field]
- [ ] Cascade deletes [related records]
- [ ] Query returns correct records for [filter]
- [ ] Handles concurrent updates correctly
- [ ] [Specific business rule] is enforced
```

**Sample:**

```typescript
import { prisma } from '../test-utils/db'; // Test database client

describe('[Model] operations', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.model.deleteMany(),
      // Clean slate
    ]);
  });

  it('creates [model] with valid data', async () => {
    const result = await createModel({ /* valid data */ });
    expect(result.id).toBeDefined();
    
    // Verify in database
    const saved = await prisma.model.findUnique({ where: { id: result.id }});
    expect(saved).toMatchObject({ /* expected */ });
  });
});
```

```
NEVER MOCK:
- The database itself (use test database)
- ORM operations
```

---

### SECTION 3: E2E TEST PLAN

E2E tests verify complete user flows through the real application. These are the ultimate "does it actually work" tests.

#### 3.1 E2E Framework Setup

```
RECOMMENDED SETUP
=================
Framework: Playwright (recommended) or Cypress
Why: [Playwright: better multi-browser, faster / Cypress: better DX, time-travel debug]
```

**Configuration:**

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev', // or build + start for realistic testing
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Add more browsers as needed
  ],
});
```

```
Test Database for E2E:
- Seed with known test data before suite
- Reset between critical tests
- Use realistic but anonymized data
```

#### 3.2 Critical User Flow Tests

For EACH critical flow identified in Phase 0:

```
FLOW: [Flow Name]
PRIORITY: CRITICAL
BUSINESS IMPACT: [Why this flow matters]

PRECONDITIONS:
- Database state: [required seed data]
- User state: [logged in as X / logged out / specific role]
```

**Test Steps:**

```typescript
test('[Flow Name]', async ({ page }) => {
  // ARRANGE: Setup preconditions
  await seedTestUser({ email: 'test@example.com', role: 'user' });
  
  // Step 1: [Action]
  await page.goto('/starting-page');
  await expect(page.getByRole('heading', { name: '[expected]' })).toBeVisible();
  
  // Step 2: [Action]
  await page.getByRole('button', { name: '[button text]' }).click();
  await expect(page.getByText('[expected result]')).toBeVisible();
  
  // Step 3: [Form submission example]
  await page.getByLabel('[field label]').fill('[test value]');
  await page.getByRole('button', { name: 'Submit' }).click();
  
  // ASSERT: Verify end state
  await expect(page).toHaveURL('/success-page');
  await expect(page.getByText('[success message]')).toBeVisible();
  
  // Verify database state (optional but recommended for critical flows)
  const dbResult = await verifyDatabaseState();
  expect(dbResult).toMatchObject({ /* expected */ });
});
```

```
HAPPY PATH VARIATIONS:
- [ ] [Variation 1 description]
- [ ] [Variation 2 description]

ERROR PATH TESTS:
- [ ] [Error scenario] → [expected error handling]
- [ ] [Error scenario] → [expected recovery option]

EDGE CASES:
- [ ] [Edge case] → [expected behavior]
```

#### 3.3 Authentication E2E Tests

```
AUTHENTICATION FLOW TESTS
=========================
PRIORITY: CRITICAL

TEST: User Registration
- [ ] Can register with valid credentials
- [ ] Shows validation errors for invalid input
- [ ] Prevents duplicate email registration
- [ ] Redirects to [expected page] after registration
- [ ] [Email verification if applicable]

TEST: User Login  
- [ ] Can login with valid credentials
- [ ] Shows error for invalid credentials
- [ ] Shows error for non-existent user
- [ ] Redirects to [expected page] after login
- [ ] "Remember me" persists session (if applicable)

TEST: Protected Routes
- [ ] Unauthenticated user redirected to login
- [ ] Authenticated user can access protected page
- [ ] Role-based access enforced ([role] can/cannot access [page])

TEST: Logout
- [ ] Logout clears session
- [ ] Cannot access protected routes after logout
- [ ] Redirect to [expected page] after logout

TEST: Password Reset (if applicable)
- [ ] Can request password reset
- [ ] Reset email sent (mock email service)
- [ ] Can set new password with valid token
- [ ] Invalid/expired token handled
```

#### 3.4 Form & Data Entry E2E Tests

For EACH critical form:

```
FORM E2E: [Form Name]
PRIORITY: [CRITICAL/HIGH]
LOCATION: [page/route]
```

**Happy Path:**

```typescript
test('successfully submits [form name]', async ({ page }) => {
  await page.goto('[form page]');
  
  // Fill all required fields
  await page.getByLabel('[Field 1]').fill('[valid value]');
  await page.getByLabel('[Field 2]').fill('[valid value]');
  await page.getByRole('combobox', { name: '[Select field]' }).selectOption('[value]');
  
  // Submit
  await page.getByRole('button', { name: '[Submit button text]' }).click();
  
  // Verify success
  await expect(page.getByText('[success message]')).toBeVisible();
  // Or redirect
  await expect(page).toHaveURL('[success url]');
});
```

```
VALIDATION TESTS:
- [ ] Empty required field shows error
- [ ] Invalid email format shows error  
- [ ] [Field-specific validation] shows error
- [ ] Errors clear when corrected

ERROR HANDLING:
- [ ] Server error shows user-friendly message
- [ ] Network error shows retry option
- [ ] Form data preserved on error
```

#### 3.5 E2E Tests to Skip (and Why)

```
TESTS BETTER SUITED FOR UNIT/INTEGRATION
========================================
Do not write E2E tests for:

- [ ] Pure utility function behavior → Unit test instead
- [ ] Individual component rendering → Component test instead
- [ ] API response parsing → Integration test instead
- [ ] Every validation rule → Component test the form instead
- [ ] Every UI state variant → Component test with props

E2E tests are expensive (slow, flaky-prone). Reserve for:
- Critical user journeys
- Multi-page flows
- Flows requiring real browser behavior
- Smoke tests for deployment verification
```

---

### SECTION 4: TESTING UTILITIES TO CREATE

Based on the codebase analysis, recommend these test utilities:

#### 4.1 Test Setup Utilities

```typescript
// test-utils/render.tsx
// Wrapper that provides all real providers

import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
// Import your REAL providers
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/auth';
// etc.

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // Fail fast in tests
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Add other providers */}
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

#### 4.2 API Mocking Setup (MSW)

```typescript
// test-utils/msw/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Default handlers for common endpoints
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ id: 1, name: 'Test User' }));
  }),
  // Add more default handlers
];

// test-utils/msw/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// In jest.setup.ts or vitest.setup.ts:
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
```

#### 4.3 Database Test Utilities

```typescript
// test-utils/db.ts
import { PrismaClient } from '@prisma/client';
// Or your ORM

const prisma = new PrismaClient();

export async function resetDatabase() {
  // Delete all data in correct order (respect foreign keys)
  await prisma.$transaction([
    prisma.childTable.deleteMany(),
    prisma.parentTable.deleteMany(),
    // etc.
  ]);
}

export async function seedTestData() {
  // Create common test data
  await prisma.user.create({
    data: {
      email: 'test@example.com',
      // etc.
    },
  });
}

export { prisma };
```

#### 4.4 E2E Test Utilities

```typescript
// e2e/utils/auth.ts
import { Page } from '@playwright/test';

export async function loginAsUser(page: Page, email = 'test@example.com') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('testpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
}

export async function loginAsAdmin(page: Page) {
  await loginAsUser(page, 'admin@example.com');
}

// e2e/utils/db.ts
export async function seedE2EDatabase() {
  // API call to seed endpoint, or direct DB access
  await fetch(`${process.env.E2E_BASE_URL}/api/test/seed`, {
    method: 'POST',
  });
}
```

---

### SECTION 5: TEST PRIORITIZATION MATRIX

Based on analysis, prioritize test creation:

```
PRIORITY 1: CRITICAL (Implement First)
======================================
These tests prevent catastrophic failures:

[ ] [Test name] - [File] - [Reason critical]
[ ] [Test name] - [File] - [Reason critical]
...

Estimated effort: [X] hours
Coverage impact: [X]% of critical paths

PRIORITY 2: HIGH (Implement Second)
===================================
These tests catch common bugs:

[ ] [Test name] - [File] - [Reason important]
[ ] [Test name] - [File] - [Reason important]
...

Estimated effort: [X] hours
Coverage impact: [X]% of core functionality

PRIORITY 3: MEDIUM (Implement Third)
====================================
These tests improve confidence:

[ ] [Test name] - [File] - [Nice to have because]
...

PRIORITY 4: LOW (Implement If Time Permits)
===========================================
Edge cases and polish:

[ ] [Test name] - [File]
...
```

---

### SECTION 6: MOCK STRATEGY GUIDE

Explicit guidance on what to mock and what NOT to mock:

```
MOCK STRATEGY FOR THIS CODEBASE
===============================

✅ MOCK THESE (and how):
------------------------
External Service: [Service Name]
How: MSW handler at [endpoint]
Example:
```

```typescript
rest.post('https://api.stripe.com/v1/charges', (req, res, ctx) => {
  return res(ctx.json({ id: 'ch_test', status: 'succeeded' }));
})
```

```
External Service: [Service Name]
How: [approach]

❌ DO NOT MOCK THESE:
---------------------
- [Internal service] → Test with real implementation
- [Database layer] → Use test database
- [State management] → Use real store
- [Validation library] → Test actual validation
- [React context] → Wrap with real provider

⚠️ MOCK ONLY IF NECESSARY:
--------------------------
- [Thing] → Only mock if [condition], otherwise use real
```

---

### SECTION 7: CI/CD INTEGRATION

Recommendations for test automation:

```
CI PIPELINE CONFIGURATION
=========================

Stage 1: Lint & Type Check (Fast, run on every push)
- npm run lint
- npm run typecheck
- Duration: ~30 seconds

Stage 2: Unit & Component Tests (Medium, run on every push)
- npm run test:unit
- Coverage threshold: [X]%
- Duration: ~2-5 minutes

Stage 3: Integration Tests (Medium-slow, run on PR)
- npm run test:integration
- Requires: Test database
- Duration: ~5-10 minutes

Stage 4: E2E Tests (Slow, run on PR to main)
- npm run test:e2e
- Requires: Full application running
- Duration: ~10-20 minutes
```

**Sample GitHub Actions:**

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit -- --coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          
  e2e-tests:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e
```

---

### SECTION 8: ANTI-PATTERNS TO AVOID

#### 8.1 Mock Hell Indicators

If you encounter any of these, STOP and reconsider the testing approach:

```
🚩 RED FLAGS - Consider E2E Instead:
====================================

1. Mock Setup Exceeds 20 Lines
   - Symptom: More mock configuration than actual test
   - Solution: Move to integration or E2E test

2. Mocking Internal Modules
   - Symptom: jest.mock('./internal-service')
   - Solution: Test them together, they're your code

3. Mocking State Management
   - Symptom: Mocking Redux store or Context
   - Solution: Use real store with initial state

4. Re-implementing Logic in Mocks
   - Symptom: Mock has conditional logic
   - Solution: You're testing the mock, not the code

5. Tests Break on Refactoring
   - Symptom: Internal change breaks tests
   - Solution: Test behavior, not implementation

6. Snapshot Everything
   - Symptom: 50+ snapshot files
   - Solution: Snapshots for serialized output only

7. Testing Framework Internals
   - Symptom: Testing React Query's caching behavior
   - Solution: Trust the library, test your usage
```

#### 8.2 Time Traps to Avoid

```
⏰ DON'T SPEND MORE THAN 15 MINUTES ON:
=======================================

- Configuring a complex mock setup
- Fighting with JSDOM limitations
- Trying to test CSS/animations
- Mocking timers for simple components
- Getting 100% coverage on utility functions

INSTEAD:
- Flag for E2E testing
- Accept slightly lower unit coverage
- Focus on behavior that matters
- Test the happy path thoroughly
```

---

## DELIVERABLES

### Output 1: Test Inventory Document

Create as markdown artifact: `TEST_INVENTORY.md`

Contains:
- Complete list of all test files to create
- Each test file's location and purpose
- Test cases within each file
- Priority level for each

### Output 2: Test Implementation Guide

Create as markdown artifact: `TEST_IMPLEMENTATION_GUIDE.md`

Contains:
- Setup instructions for test infrastructure
- Code for test utilities (render helpers, MSW setup, DB utils)
- Sample test implementations for each pattern
- Mock strategy reference

### Output 3: Priority Action Plan

Create as markdown artifact: `TEST_ACTION_PLAN.md`

Contains:
- Ordered list of tests to implement
- Estimated effort for each
- Dependencies between tests
- Definition of done criteria

### Summary Statistics

```
TESTING AUDIT SUMMARY
=====================
Total Testable Units Identified: [N]
  - Components: [N]
  - Hooks: [N]
  - Utilities: [N]
  - API Endpoints: [N]
  - Database Operations: [N]

Tests Recommended:
  - Unit/Component Tests: [N]
  - Integration Tests: [N]
  - E2E Tests: [N]

Estimated Implementation Time:
  - Critical (P1): [X] hours
  - High (P2): [X] hours  
  - Medium (P3): [X] hours
  - Low (P4): [X] hours
  - Total: [X] hours

Current Coverage: [X]%
Projected Coverage After P1+P2: [X]%

Mock Complexity Assessment:
  - Simple mocks needed: [N]
  - Complex mocks (consider E2E): [N]
  - No mocking needed: [N]
```

---