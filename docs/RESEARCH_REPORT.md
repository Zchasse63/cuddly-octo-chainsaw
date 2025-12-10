# Research Report: Type Error Root Causes & Solutions

> Generated: December 9, 2025  
> Sources: Vercel AI SDK Docs, tRPC Docs, ESLint Docs, Context7, Web Search

## Executive Summary

The VoiceFit project has **275 TypeScript errors** stemming from three main causes:

1. **Vercel AI SDK v5 Breaking Changes** - Major API restructuring
2. **tRPC v11 Transformer Configuration** - Transformer moved to link level
3. **ESLint Configuration** - Missing flat config setup for mobile app

---

## 1. Vercel AI SDK v5 Breaking Changes

### Current Project Versions
```json
{
  "ai": "^5.0.106",
  "@ai-sdk/xai": "^2.0.39"
}
```

### Key Breaking Changes

#### 1.1 `maxTokens` → `maxOutputTokens`
**Change:** Parameter renamed for clarity.

```typescript
// ❌ OLD (v4)
const result = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  maxTokens: 1024,
  prompt: 'Hello, world!',
});

// ✅ NEW (v5)
const result = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  maxOutputTokens: 1024,
  prompt: 'Hello, world!',
});
```

#### 1.2 `maxSteps` Removed from `useChat`
**Change:** Server-side `stopWhen` conditions now control multi-step execution.

```typescript
// ❌ OLD (v4) - useChat with maxSteps
const { messages } = useChat({
  maxSteps: 5,
});

// ✅ NEW (v5) - Use prepareStep/stopWhen on server
const result = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  tools: { weatherTool },
  prepareStep: ({ steps, stepNumber }) => {
    // Control execution per step
    return { activeTools: ['weatherTool'] };
  },
});
```

**Note:** For server-side `generateText`, `maxSteps` may still be valid in some contexts, but the type definition has changed. Check actual usage.

#### 1.3 `parameters` → `inputSchema`
**Change:** Tool definitions now use `inputSchema` instead of `parameters`.

```typescript
// ❌ OLD (v4)
const weatherTool = tool({
  description: 'Get the weather',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => { /* ... */ },
});

// ✅ NEW (v5)
const weatherTool = tool({
  description: 'Get the weather',
  inputSchema: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => { /* ... */ },
});
```

#### 1.4 Tool `execute()` Function Signature
**Change:** `execute` now receives a second `options` argument.

```typescript
// ❌ OLD (v4)
execute: async (input) => { /* ... */ }

// ✅ NEW (v5)
execute: async (input, options) => {
  // options contains: { experimental_context, abortSignal, ... }
  return { /* result */ };
}
```

#### 1.5 `ToolExecutionError` Removed
**Change:** Tool errors now appear as `tool-error` content parts.

```typescript
// ❌ OLD - Throwing ToolExecutionError
throw new ToolExecutionError('Something went wrong');

// ✅ NEW - Errors appear in result.steps as 'tool-error' parts
// Handle via result inspection rather than try/catch
```

#### 1.6 `toolResults[].result` Property Changed
**Change:** Access pattern for tool results has changed in `TypedToolResult`.

```typescript
// Check the actual property name - may be 'output' instead of 'result'
// Inspect TypedToolResult type definition for correct access pattern
```

### Migration Tools

Vercel provides automated codemods:
```bash
# Run all v5 codemods
npx @ai-sdk/codemod upgrade

# Or run v5-specific codemods only
npx @ai-sdk/codemod v5
```

---

## 2. tRPC v11 Transformer Configuration

### Current Project Versions
```json
{
  "@trpc/server": "^11.0.0-rc.446",
  "@trpc/client": "^11.0.0-rc.446",
  "@trpc/react-query": "^11.0.0-rc.446",
  "superjson": "^2.2.1"
}
```

### The Issue

**Error:** `TypeError: transformer must be defined on initTRPC first`

In tRPC v10, the transformer was configured at the client level:
```typescript
// ❌ v10 pattern (no longer works in v11)
const client = createTRPCClient<AppRouter>({
  transformer: superjson,  // ← This caused issues
  links: [httpBatchLink({ url: '...' })],
});
```

### tRPC v11 Solution

**The transformer must be configured in TWO places:**

#### 2.1 Server Side - `initTRPC.create()`
```typescript
// apps/backend/src/trpc/index.ts
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,  // ← ADD THIS
  errorFormatter({ shape, error }) {
    return { /* ... */ };
  },
});
```

#### 2.2 Client Side - Inside `httpBatchLink`
```typescript
// apps/mobile/src/lib/trpc.ts & apps/web/src/app/layout.tsx
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

export function createTRPCClient() {
  return api.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        transformer: superjson,  // ✅ Correct - inside link
        headers() { /* ... */ },
      }),
    ],
  });
}
```

### Key Points
- **v11 moved transformer to the link level** (`httpBatchLink`, `httpLink`, `wsLink`)
- **Server MUST also have transformer configured** in `initTRPC.create()`
- Both client AND server must use the SAME transformer

---

## 3. ESLint Configuration Issues

### Current State
- **Backend:** ESLint v8.57.0 - No files matching pattern (glob issue)
- **Mobile:** ESLint v8.57.0 - Missing config file entirely
- **Web:** ESLint v8.57.0 + next/eslint - Needs interactive setup

### ESLint 9 Flat Config (Recommended)

ESLint 9 introduced "flat config" (`eslint.config.js`) as the new default:

```javascript
// eslint.config.js (flat config format)
import { defineConfig } from "eslint/config";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Your rules
    },
  },
]);
```

### For React Native/Expo (Mobile App)

```javascript
// apps/mobile/eslint.config.js
import { defineConfig } from "eslint/config";
import reactPlugin from "eslint-plugin-react";
import reactNativePlugin from "eslint-plugin-react-native";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // React Native globals
        __DEV__: "readonly",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-native": reactNativePlugin,
      "@typescript-eslint": tseslint,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
    },
  },
]);
```

### Using Legacy eslintrc with ESLint 8

If staying on ESLint 8.x, use `.eslintrc.js`:

```javascript
// apps/mobile/.eslintrc.js
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-native/all",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-native"],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    project: "./tsconfig.json",
  },
  settings: {
    react: { version: "detect" },
  },
  env: {
    "react-native/react-native": true,
  },
  rules: {
    "react/react-in-jsx-scope": "off",
  },
};
```

---

## 4. Backend tsconfig.json Fix

### Issue: Set Iteration Error (TS2802)

```
Set can only be iterated with '--downlevelIteration' flag
```

### Solution

Add `downlevelIteration` or change target to ES2015+:

```json
// apps/backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "downlevelIteration": true,  // ← ADD THIS
    // ... rest of config
  }
}
```

**Why:** The code uses `[...new Set()]` spread syntax. Without `downlevelIteration`, TypeScript can't properly emit code for iterating Sets when targeting older ES versions.

---

## 5. Missing Type Definitions

### TestUser Type
Create in test utilities:
```typescript
// apps/backend/src/__tests__/test-utils.ts
export interface TestUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'free' | 'premium' | 'coach';
  // Add other required properties
}
```

### ProgramQuestionnaireData Type
Either export from existing types or create:
```typescript
// Check if this exists in your schema or types
export interface ProgramQuestionnaireData {
  goals: string[];
  experience: string;
  // ... other fields
}
```

### Missing Schema Exports
In `apps/backend/src/db/schema/index.ts`, ensure:
```typescript
export * from './injuries';  // If file exists
export * from './generatedPrograms';  // If file exists
// OR create these tables if they don't exist
```

---

## 6. Mobile Theme System Fixes

### Missing `colors.status`

Add to theme configuration:
```typescript
// apps/mobile/src/theme/colors.ts (or similar)
export const colors = {
  // ... existing colors
  status: {
    success: '#22C55E',  // green-500
    warning: '#F59E0B',  // amber-500
    error: '#EF4444',    // red-500
    info: '#3B82F6',     // blue-500
  },
  border: {
    default: '#E5E7EB',  // gray-200
    // ... other borders
  },
};
```

### Missing `fontSize['4xl']`

```typescript
// apps/mobile/src/theme/typography.ts
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,  // ← ADD THIS
  '5xl': 48,
};
```

### Missing `fontWeight.normal`

```typescript
export const fontWeight = {
  normal: '400',    // ← ADD THIS (or rename 'regular' to 'normal')
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};
```

---

## 7. Component Prop Type Fixes

### Button Component

```typescript
// apps/mobile/src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;  // ← Change from string
  onPress: () => void;
  style?: StyleProp<ViewStyle>;  // ← ADD THIS
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}
```

### Input Component

```typescript
// apps/mobile/src/components/Input.tsx
interface InputProps {
  // ... existing props
  autoFocus?: boolean;  // ← ADD THIS
}
```

---

## 8. Recommended Fix Order

### Phase 1: Configuration (Unblocks everything else)
1. ✅ Add `downlevelIteration: true` to backend tsconfig.json
2. ✅ Add `transformer: superjson` to backend `initTRPC.create()`
3. ✅ Create ESLint config for mobile app

### Phase 2: Type Definitions
4. Export/create `TestUser` interface
5. Export/create `ProgramQuestionnaireData` interface
6. Export missing schema tables (`injuries`, `generatedPrograms`)

### Phase 3: AI SDK Migration
7. Run `npx @ai-sdk/codemod v5` for automated fixes
8. Update `maxTokens` → `maxOutputTokens`
9. Update `parameters` → `inputSchema` in tool definitions
10. Fix `tool.execute()` signatures (add options param)

### Phase 4: Theme & Component Types
11. Add `colors.status` to theme
12. Add `fontSize['4xl']` to theme
13. Add `fontWeight.normal` to theme
14. Fix Button component props (children, style)
15. Fix Input component props (autoFocus)

### Phase 5: tRPC Router Alignment
16. Audit all tRPC calls from mobile/web
17. Implement missing router methods OR remove unused calls
18. Fix auth response types (add `token` property)

### Phase 6: Dependency Installation
```bash
# Mobile dependencies
cd apps/mobile
npm install expo-notifications @react-native-community/netinfo
npm install -D @types/detox

# If using PowerSync
npm install @powersync/react-native
```

---

## References

- [AI SDK 5.0 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [tRPC v10 to v11 Migration](https://trpc.io/docs/migrate-from-v10-to-v11)
- [tRPC Data Transformers](https://trpc.io/docs/server/data-transformers)
- [ESLint Flat Config Migration](https://eslint.org/docs/latest/use/configure/migration-guide)
- [TypeScript downlevelIteration](https://www.typescriptlang.org/tsconfig#downlevelIteration)

