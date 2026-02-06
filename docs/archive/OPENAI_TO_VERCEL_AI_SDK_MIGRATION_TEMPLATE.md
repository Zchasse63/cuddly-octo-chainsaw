# OpenAI SDK to Vercel AI SDK Migration Audit

## Overview
You are a senior AI infrastructure engineer conducting a comprehensive migration analysis. Your task is to autonomously discover all OpenAI SDK usage in this codebase and produce a complete migration plan to Vercel AI SDK, maximizing the new capabilities available.

---

## PHASE 0: AUTONOMOUS DISCOVERY & CURRENT STATE MAPPING

Before planning the migration, you must first discover and document all existing AI/LLM integration points.

### Step 1: Identify Current AI Infrastructure

Analyze the codebase to determine:

**OpenAI SDK Usage:**
- SDK version (check package.json for `openai`)
- Import patterns (`import OpenAI from 'openai'` vs named imports)
- Client instantiation patterns (singleton, per-request, etc.)
- Environment variable names for API keys

**API Endpoints Used:**
- Chat Completions (`/v1/chat/completions`)
- Completions (legacy `/v1/completions`)
- Embeddings (`/v1/embeddings`)
- Images (DALL-E)
- Audio (Whisper, TTS)
- Assistants API
- Files API
- Fine-tuning API
- Moderations API

**Models Referenced:**
- GPT-4 variants (gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini)
- GPT-3.5 variants
- Embedding models (text-embedding-ada-002, text-embedding-3-small/large)
- Image models (dall-e-2, dall-e-3)
- Audio models (whisper-1, tts-1, tts-1-hd)

**Integration Patterns:**
- Direct API calls
- Streaming vs non-streaming
- Function calling / Tools
- JSON mode / Structured outputs
- System prompts management
- Conversation history handling
- Token counting
- Rate limiting / retry logic

**Document your findings in this format:**
```
CURRENT OPENAI SDK STATE
========================
SDK Version: [version from package.json]
Client Pattern: [singleton/per-request/other]
API Key Env Var: [OPENAI_API_KEY or custom]

Endpoints in Use:
- Chat Completions: [Yes/No] - [count] locations
- Embeddings: [Yes/No] - [count] locations
- Assistants: [Yes/No] - [count] locations
- Images: [Yes/No] - [count] locations
- Audio: [Yes/No] - [count] locations
- Files: [Yes/No] - [count] locations

Models Referenced: [list all unique model strings found]

Streaming Usage: [Yes/No] - [count] locations
Function Calling: [Yes/No] - [count] locations
Structured Outputs: [Yes/No] - [count] locations
```

### Step 2: Map All AI Integration Points

For each file that imports or uses OpenAI SDK, document:

**File-Level Inventory:**
```
FILE: [path/to/file.ts]
├── Import Statement: [exact import]
├── Client Instantiation: [how client is created]
├── Functions Using OpenAI:
│   ├── [functionName]: [purpose]
│   │   ├── Endpoint: [chat.completions.create, etc.]
│   │   ├── Model: [model string]
│   │   ├── Streaming: [Yes/No]
│   │   ├── Tools/Functions: [Yes/No] - [list if yes]
│   │   ├── Response Handling: [description]
│   │   └── Error Handling: [description]
```

Create a comprehensive inventory table:

| File Path | Function/Method | OpenAI Endpoint | Model | Streaming | Tools | Complexity | Migration Effort |
|-----------|-----------------|-----------------|-------|-----------|-------|------------|------------------|
| | | | | | | | |

### Step 3: Identify Architectural Patterns

Discover how AI is architected in the application:

**Service Layer Patterns:**
- Is there a centralized AI service/client?
- Are AI calls scattered across components?
- Is there an abstraction layer already?
- How is configuration managed?

**State Management:**
- How is conversation history managed?
- Is there message persistence?
- How are AI responses cached (if at all)?

**Error Handling:**
- Retry mechanisms
- Fallback strategies
- Error reporting/logging
- Rate limit handling

**Type Definitions:**
- Custom types for AI requests/responses
- Zod schemas or other validation
- TypeScript strictness level

**Document patterns:**
```
ARCHITECTURAL PATTERNS
======================
Centralized AI Service: [Yes/No] - [location if yes]
Abstraction Layer: [Yes/No] - [description]
Config Management: [description]
History Management: [description]
Error Strategy: [description]
Type Safety Level: [High/Medium/Low]
```

### Step 4: Identify External Dependencies

Find related packages and integrations:

**AI-Related Packages:**
- `openai` - version
- `tiktoken` or token counting libraries
- `langchain` or similar orchestration
- `zod` for schema validation
- AI-specific utilities

**Framework Integration:**
- Next.js API routes vs App Router
- Express/Fastify endpoints
- Edge runtime usage
- Serverless function patterns

**Frontend AI Integration:**
- React hooks for AI
- Streaming UI components
- Loading/error states
- Real-time updates (SSE, WebSocket)

---

## PHASE 1: VERCEL AI SDK CAPABILITY MAPPING

Now map current functionality to Vercel AI SDK equivalents and identify new capabilities.

### SECTION 1: CORE API MAPPING

For each OpenAI SDK pattern, document the Vercel AI SDK equivalent:

#### Chat Completions Migration

**Current OpenAI Pattern:**
```typescript
// Document actual patterns found in codebase
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  // other options
});
```

**Vercel AI SDK Equivalent:**
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4'),
  messages: [...],
});
```

**Migration Table:**

| OpenAI SDK Method | Vercel AI SDK Method | Package | Notes |
|-------------------|---------------------|---------|-------|
| `chat.completions.create()` | `generateText()` | `ai` | Non-streaming |
| `chat.completions.create({ stream: true })` | `streamText()` | `ai` | Streaming |
| `embeddings.create()` | `embed()` / `embedMany()` | `ai` | Single/batch |
| Function calling | `tools` parameter | `ai` | Enhanced tool system |
| JSON mode | `generateObject()` | `ai` | Schema-validated |
| | | | |

### SECTION 2: PROVIDER ABSTRACTION ANALYSIS

Document multi-provider opportunities:

**Current State:**
- Single provider (OpenAI only)
- Hardcoded model strings
- No fallback providers

**Vercel AI SDK Provider Options:**
```
AVAILABLE PROVIDERS
===================
@ai-sdk/openai      - OpenAI (GPT-4, GPT-4o, etc.)
@ai-sdk/anthropic   - Anthropic (Claude 3.5, Claude 3)
@ai-sdk/google      - Google (Gemini Pro, Gemini Flash)
@ai-sdk/mistral     - Mistral AI
@ai-sdk/cohere      - Cohere
@ai-sdk/amazon-bedrock - AWS Bedrock (multiple models)
@ai-sdk/azure       - Azure OpenAI
@ai-sdk/google-vertex - Google Vertex AI
@ai-sdk/xai         - xAI (Grok)
@ai-sdk/groq        - Groq (fast inference)
@ai-sdk/perplexity  - Perplexity (search-augmented)
@ai-sdk/fireworks   - Fireworks AI
@ai-sdk/deepseek    - DeepSeek
@ai-sdk/cerebras    - Cerebras
```

**Provider Strategy Recommendations:**
For each use case in the codebase, recommend optimal providers:

| Use Case | Current Model | Recommended Primary | Recommended Fallback | Rationale |
|----------|---------------|--------------------|--------------------|-----------|
| | | | | |

### SECTION 3: STREAMING ARCHITECTURE UPGRADE

Analyze and enhance streaming patterns:

**Current Streaming Implementation:**
- How streams are consumed
- How chunks are processed
- UI update patterns
- Error handling in streams

**Vercel AI SDK Streaming Enhancements:**
```typescript
// Document recommended patterns
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  messages,
  onChunk: ({ chunk }) => { /* real-time processing */ },
  onFinish: ({ text, usage }) => { /* completion handling */ },
});

// Multiple consumption options:
result.textStream      // AsyncIterable<string>
result.fullStream      // Full delta stream with metadata
result.toDataStream()  // For Response streaming
result.toTextStreamResponse() // Direct Response object
```

**React/Next.js Integration:**
```typescript
// useChat hook for conversational UI
import { useChat } from 'ai/react';

// useCompletion for single completions
import { useCompletion } from 'ai/react';

// useObject for streaming structured data
import { useObject } from 'ai/react';
```

| Current Pattern | Recommended Upgrade | Benefits |
|-----------------|--------------------| ---------|
| | | |

### SECTION 4: TOOL/FUNCTION CALLING MIGRATION

Transform function calling to Vercel AI SDK tools:

**Current Function Definitions:**
Document all existing function/tool definitions in the codebase.

**Vercel AI SDK Tool Pattern:**
```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The city and state'),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, unit }) => {
    // Tool implementation
    return { temperature: 72, condition: 'sunny' };
  },
});

// Usage
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { weather: weatherTool },
  prompt: 'What is the weather in San Francisco?',
});
```

**Tool Migration Table:**

| Current Function Name | Parameters | Vercel AI SDK Tool | Schema (Zod) | Execute Function |
|-----------------------|------------|--------------------| -------------|------------------|
| | | | | |

### SECTION 5: STRUCTURED OUTPUT / OBJECT GENERATION

Migrate JSON mode to generateObject:

**Current JSON Mode Usage:**
```typescript
// Document current patterns
response_format: { type: 'json_object' }
```

**Vercel AI SDK generateObject:**
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a recipe for chocolate cake',
});
// object is fully typed and validated
```

**Benefits Over Current Approach:**
- Type-safe responses
- Automatic validation
- No manual JSON parsing
- Schema reuse
- Better error messages

| Current JSON Output | Zod Schema | generateObject Pattern | Type Safety |
|--------------------|------------|------------------------|-------------|
| | | | |

### SECTION 6: AGENT ROUTING & MULTI-MODEL STRATEGIES

Design intelligent model routing:

**Router Pattern:**
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Model registry
const models = {
  fast: openai('gpt-4o-mini'),
  smart: openai('gpt-4o'),
  coding: anthropic('claude-sonnet-4-20250514'),
  creative: anthropic('claude-sonnet-4-20250514'),
  vision: openai('gpt-4o'),
  cheap: google('gemini-1.5-flash'),
};

// Router function
function selectModel(task: TaskType, context: Context) {
  if (task.requiresVision) return models.vision;
  if (task.isCodeGeneration) return models.coding;
  if (task.isSimpleQuery) return models.fast;
  if (task.requiresReasoning) return models.smart;
  return models.fast;
}
```

**Fallback Chain Pattern:**
```typescript
import { generateText } from 'ai';

async function generateWithFallback(params) {
  const providers = [
    openai('gpt-4o'),
    anthropic('claude-sonnet-4-20250514'),
    google('gemini-1.5-pro'),
  ];
  
  for (const model of providers) {
    try {
      return await generateText({ ...params, model });
    } catch (error) {
      console.warn(`${model} failed, trying next...`);
    }
  }
  throw new Error('All providers failed');
}
```

**Recommended Routing Strategy for This Project:**

| Task Category | Primary Model | Fallback | Routing Logic |
|---------------|---------------|----------|---------------|
| | | | |

### SECTION 7: AI SDK UI INTEGRATION

Map frontend patterns to AI SDK React hooks:

**useChat Hook (Conversational UI):**
```typescript
'use client';
import { useChat } from 'ai/react';

export function ChatComponent() {
  const { 
    messages,      // Message[]
    input,         // string
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,        // Retry last message
    stop,          // Stop generation
    setMessages,   // Manual message control
  } = useChat({
    api: '/api/chat',
    onFinish: (message) => { /* completion callback */ },
    onError: (error) => { /* error handling */ },
  });
  
  return (/* UI */);
}
```

**useCompletion Hook (Single Prompt):**
```typescript
import { useCompletion } from 'ai/react';

const { 
  completion, 
  complete, 
  isLoading 
} = useCompletion({
  api: '/api/completion',
});
```

**useObject Hook (Streaming Structured Data):**
```typescript
import { useObject } from 'ai/react';

const { object, submit, isLoading } = useObject({
  api: '/api/generate-recipe',
  schema: recipeSchema,
});
```

**Current Frontend Patterns → AI SDK Hooks:**

| Current Implementation | Recommended Hook | API Route Pattern | Benefits |
|------------------------|-----------------|-------------------|----------|
| | | | |

### SECTION 8: EMBEDDINGS MIGRATION

Transform embedding generation:

**Current Pattern:**
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'text to embed',
});
```

**Vercel AI SDK Pattern:**
```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Single embedding
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'text to embed',
});

// Batch embeddings (more efficient)
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['text 1', 'text 2', 'text 3'],
});
```

**Embedding Use Cases in Codebase:**

| Location | Purpose | Current Model | Recommended Migration |
|----------|---------|---------------|----------------------|
| | | | |

### SECTION 9: ASSISTANTS API MIGRATION

If using OpenAI Assistants, document migration path:

**Current Assistants Usage:**
- Threads management
- File attachments
- Code interpreter
- Retrieval/Knowledge

**Vercel AI SDK Alternatives:**

| Assistants Feature | AI SDK Alternative | Implementation Notes |
|--------------------|--------------------| --------------------|
| Threads | Custom message history | Manage in database |
| Code Interpreter | Custom code execution tool | Sandboxed execution |
| File Search | RAG with embeddings | Vector DB integration |
| Function Calling | AI SDK Tools | Direct migration |

### SECTION 10: NEW CAPABILITIES TO LEVERAGE

Features available in Vercel AI SDK not currently used:

**1. Middleware System:**
```typescript
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

const wrappedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: {
    transformParams: async ({ params }) => {
      // Modify all requests (add system prompts, etc.)
      return { ...params, /* modifications */ };
    },
    wrapGenerate: async ({ doGenerate, params }) => {
      // Wrap generation (logging, caching, etc.)
      console.log('Generating with:', params);
      const result = await doGenerate();
      console.log('Tokens used:', result.usage);
      return result;
    },
  },
});
```

**2. Telemetry & Observability:**
```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: '...',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'my-function',
    metadata: { userId: '123' },
  },
});
```

**3. Provider Metadata Access:**
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: '...',
});

// Access provider-specific info
console.log(result.experimental_providerMetadata);
console.log(result.usage); // Token usage
console.log(result.finishReason); // Why generation stopped
```

**4. Image Input (Vision):**
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this image' },
      { type: 'image', image: imageBuffer }, // or URL
    ],
  }],
});
```

**5. Multi-Step Tool Execution:**
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { /* tools */ },
  maxSteps: 5, // Allow up to 5 tool call rounds
  onStepFinish: ({ stepType, toolCalls, toolResults }) => {
    console.log('Step completed:', stepType);
  },
});
```

**Recommended New Features for This Project:**

| Feature | Use Case in Project | Priority | Implementation Effort |
|---------|--------------------| ---------|----------------------|
| | | | |

---

## PHASE 2: MIGRATION IMPLEMENTATION PLAN

### SECTION 11: DEPENDENCY CHANGES

**Packages to Add:**
```json
{
  "ai": "^4.x.x",
  "@ai-sdk/openai": "^1.x.x",
  "@ai-sdk/anthropic": "^1.x.x",  // If multi-provider
  "@ai-sdk/google": "^1.x.x",     // If multi-provider
  "zod": "^3.x.x"                  // For schemas
}
```

**Packages to Remove (after migration):**
```json
{
  "openai": "^4.x.x"  // Can remove after full migration
}
```

**Environment Variables:**
```
# Keep existing
OPENAI_API_KEY=...

# Add for multi-provider (optional)
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### SECTION 12: FILE-BY-FILE MIGRATION CHECKLIST

For each file requiring changes:
```
MIGRATION CHECKLIST
===================
[ ] File: [path]
    [ ] Update imports
    [ ] Replace client instantiation
    [ ] Migrate each function:
        [ ] [function1]
        [ ] [function2]
    [ ] Update types
    [ ] Test functionality
    [ ] Remove old code
```

| File | Functions to Migrate | Complexity | Order | Dependencies |
|------|---------------------|------------|-------|--------------|
| | | | | |

### SECTION 13: API ROUTE TRANSFORMATIONS

**Next.js App Router Pattern:**
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });
  
  return result.toDataStreamResponse();
}
```

**Next.js Pages Router Pattern:**
```typescript
// pages/api/chat.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function handler(req, res) {
  const { messages } = req.body;
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });
  
  return result.pipeDataStreamToResponse(res);
}
```

**Current API Routes → New Patterns:**

| Current Route | New Implementation | Hooks Compatibility |
|---------------|--------------------| -------------------|
| | | |

### SECTION 14: TYPE SYSTEM MIGRATION

**OpenAI Types → Vercel AI SDK Types:**

| OpenAI Type | AI SDK Type | Import From |
|-------------|-------------|-------------|
| `ChatCompletionMessage` | `CoreMessage` | `ai` |
| `ChatCompletionTool` | `CoreTool` | `ai` |
| `ChatCompletionMessageParam` | `CoreMessage` | `ai` |
| | | |

**Custom Type Updates Required:**

| Current Type | Location | Changes Needed |
|--------------|----------|----------------|
| | | |

### SECTION 15: TESTING STRATEGY

**Unit Tests:**
- Mock provider responses
- Test tool execution
- Validate schema outputs

**Integration Tests:**
- End-to-end streaming
- Multi-provider fallback
- Error handling

**Test Migration Checklist:**

| Test File | Current Coverage | Updates Needed | Priority |
|-----------|------------------|----------------|----------|
| | | | |

---

## PHASE 3: DELIVERABLES

### SECTION 16: MIGRATION SUMMARY

**Overall Migration Scope:**
```
FILES REQUIRING CHANGES
=======================
Total Files: [N]
High Complexity: [N]
Medium Complexity: [N]
Low Complexity: [N]

Estimated Effort: [X hours/days]
```

**Breaking Changes:**
- List any breaking changes to existing APIs
- Required frontend updates
- Database schema changes (if any)

### SECTION 17: PRIORITIZED IMPLEMENTATION ORDER

**Phase 1 - Foundation (Do First):**
1. Install dependencies
2. Create provider configuration
3. Migrate utility/service layer

**Phase 2 - Core Features:**
1. Migrate primary API routes
2. Update frontend hooks
3. Migrate tool definitions

**Phase 3 - Advanced Features:**
1. Implement multi-provider routing
2. Add middleware/observability
3. Optimize streaming patterns

**Phase 4 - Cleanup:**
1. Remove old OpenAI SDK code
2. Update documentation
3. Performance testing

### SECTION 18: RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API behavior differences | Medium | High | Thorough testing |
| Streaming compatibility | Low | Medium | Use AI SDK helpers |
| Type mismatches | Medium | Low | Gradual migration |
| | | | |

### SECTION 19: ROLLBACK PLAN

If migration issues occur:
1. Feature flag to switch between implementations
2. Parallel deployment capability
3. Database compatibility maintained

---

## DELIVERABLE SUMMARY

**Migration Readiness Score:** [X/10]

**Current State:**
- OpenAI SDK Version: [version]
- Total AI Integration Points: [N]
- Streaming Implementations: [N]
- Tool/Function Definitions: [N]

**Target State:**
- Vercel AI SDK Version: [latest]
- Multi-Provider Support: [Yes/No]
- Enhanced Features: [list]

**Top 5 Migration Benefits:**
1. [Benefit with specific improvement]
2. [Benefit with specific improvement]
3. [Benefit with specific improvement]
4. [Benefit with specific improvement]
5. [Benefit with specific improvement]

**Immediate Action Items:**
1. [First step]
2. [Second step]
3. [Third step]

**Files Changed Summary:**
- API Routes: [N]
- Services: [N]
- Components: [N]
- Types: [N]
- Tests: [N]

---

## END OF PROMPT