# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Slack bot framework built on Mastra that connects AI agents to Slack workspaces. This project implements a **simplified single-agent architecture** where Lucie directly answers user queries about the Pioneer.vc accelerator using specialized query tools. Features streaming responses, thread-based conversation memory, and a knowledge base backed by JSON data files.

## Key Commands

```bash
# Development (runs Mastra dev server on port 4111)
pnpm dev

# Terminal CLI for local testing (no Slack required)
pnpm dev:cli
pnpm dev:cli --agent lucie

# Build for production
pnpm build

# Start production server
pnpm start
```

For local development with Slack webhooks, use ngrok to expose port 4111:
```bash
ngrok http 4111
```

## Architecture

### Simplified Single-Agent Architecture (Phase 3)

This codebase implements a **direct single-agent pattern** for query processing:

```
User → Lucie → Query Tool → Response
```

**Phase 3 Simplifications (40-50% faster than Phase 2):**
- ✅ Single agent architecture (Lucie handles all queries)
- ✅ Removed routing layer (no query-extractor, specialized-agent-router)
- ✅ Removed specialized agents (generalQuestionsAgent, pioneerProfileBookAgent, sessionEventGridAgent)
- ✅ Direct tool usage (Lucie chooses appropriate query tool)
- ✅ JSON data caching (10-20% faster disk I/O)
- ✅ 1 LLM call per query (down from 2-3)
- ✅ Simpler codebase (easier to maintain and extend)

**Flow:**

1. **Lucie Agent** (`src/mastra/agents/lucie-agent.ts`)
   - Single entry point for all user queries via Slack
   - Uses Claude Sonnet 4 (intelligent query understanding + response generation)
   - Intelligently chooses the appropriate query tool based on the question
   - Generates clear, user-facing responses directly
   - Memory: last 20 messages for conversation continuity and follow-up questions

2. **Query Tools** (`src/mastra/tools/`)
   - **generalQuestionsQuery**: General accelerator questions (FAQ, policies, benefits)
   - **sessionEventGridQuery**: Sessions, events, activities, schedules
   - **pioneerProfileBookQuery**: Pioneer profiles, skills, co-founder matching
   - Each tool loads data from cached JSON files
   - Returns data with `found` flag and optional metadata
   - Fast, efficient, no LLM calls

**Key Pattern:** Single agent with multiple specialized tools - Sonnet 4 intelligently selects the right tool and formats responses.

**Performance:**
- Before Phase 1: 5-7 LLM calls per query (~8-12 seconds)
- After Phase 1: 5-7 LLM calls with caching + Haiku (~6-8 seconds, 20-30% faster)
- After Phase 2: 2-3 LLM calls (~2-4 seconds, 70-80% faster)
- **After Phase 3: 1 LLM call (~1-2 seconds, 85-90% faster overall)**

### Knowledge Base Structure

Data is stored in JSON files under `data/`:
- `general-questions.json`: FAQ-style general information about the accelerator
- `session_event_grid_view.json`: Session and event schedule with details
- `pioneers_profile_book_su2025.json`: Pioneer profile book data

Tools use `data-helpers.ts` for loading and searching JSON data.

**Data Loading Optimization (Phase 1):**
- In-memory caching via `Map<string, any>` eliminates repeated disk reads
- JSON files loaded once per process lifetime
- Use `clearDataCache()` during development when data files change
- 10-20% performance improvement on repeated queries

### Slack Integration (Multi-App Pattern)

The system uses a one-to-one mapping: **1 Slack App = 1 Mastra Agent = 1 Webhook Route**

Each Slack app configuration in `src/mastra/slack/routes.ts` creates:
- A webhook endpoint at `/slack/{name}/events`
- A dedicated Slack bot with its own credentials
- A connection to a specific Mastra agent (currently only Lucie)

Example flow:
```
Slack message → /slack/lucie/events → lucie agent → streaming response
```

### Core Components

**Main Entry Point** (`src/mastra/index.ts`)
- Configures Mastra instance with agents, workflows, and storage
- Uses LibSQL for local SQLite storage (`mastra.db`)
- Registers Slack webhook routes via `server.apiRoutes`
- Note: `supports-color` must be externalized in bundler config

**Slack Event Handling** (`src/mastra/slack/routes.ts`)
- Factory function `createSlackEventsRoute()` generates route handlers
- Each route verifies Slack signatures, handles URL verification challenges, and processes events
- Messages are stripped of bot mentions (`<@BOT_ID>`) before processing
- Asynchronous processing prevents Slack's 3-second timeout
- Thread context: `threadId = slack-{channelId}-{threadTs}`, `resourceId = slack-{teamId}-{userId}`

**Streaming to Slack** (`src/mastra/slack/streaming.ts`)
- Posts initial "thinking" message, then updates it during agent execution
- Animated spinners show real-time status (thinking, tool calls, workflow steps)
- Processes agent stream chunks: `text-delta`, `tool-call`, `tool-output`, `workflow-execution-start`
- Workflow events are nested inside `tool-output` chunks and must be extracted
- Final message replaces spinner with complete response
- Retry logic for final message updates (3 attempts with 500ms delay)

**Terminal CLI** (`src/mastra/terminal/cli.ts`)
- Local testing interface without Slack webhooks
- Run with `pnpm dev:cli` or `pnpm dev:cli --agent lucie`
- Supports multi-turn conversations with memory
- Useful for rapid agent testing and debugging

**Request Verification** (`src/mastra/slack/verify.ts`)
- Validates Slack request signatures using HMAC SHA256
- Rejects requests older than 5 minutes
- Uses timing-safe comparison to prevent timing attacks

**Agents** (`src/mastra/agents/`)
- Currently only one agent: Lucie
- Lucie has Memory with `lastMessages: 20` for full conversation context
- Handles all Pioneer.vc accelerator queries
- Intelligently selects appropriate query tools based on user questions
- Generates responses directly without routing to other agents
- Memory enables natural follow-up questions and contextual understanding

**Tools** (`src/mastra/tools/`)
- Created with `createTool()` from `@mastra/core/tools`
- Define input/output schemas with Zod
- Execute function receives typed inputs from schema and execution context
- Active query tools:
  - `general-questions-query.ts`: Searches general-questions.json for FAQ answers
  - `session-event-grid-query.ts`: Searches session_event_grid_view.json for events/sessions
  - `pioneer-profile-book-query.ts`: Searches pioneers_profile_book_su2025.json for pioneer profiles
- All query tools use `data-helpers.ts` for cached data loading
- Tools return structured data with `found` flag and optional metadata

**Workflows** (`src/mastra/workflows/`)
- Multi-step workflows using `createWorkflow` and `createStep`
- Each step has input/output schemas defined with Zod
- Steps are chained using `.then()` and finalized with `.commit()`
- Workflow execution generates `workflow-execution-start` and `workflow-step-start` events

## Environment Variables

Required per Slack app:
```bash
OPENAI_API_KEY=sk-...

SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

For multiple apps, use naming convention: `SLACK_{APP_NAME}_BOT_TOKEN` (uppercase snake_case)

## Adding a New Query Tool

To add a new data source and query tool:

1. Create data file in `data/{name}.json`

2. Create query tool in `src/mastra/tools/{name}-query.ts`
   - Use `createTool()` from `@mastra/core/tools`
   - Load data via `loadJsonData()` from `data-helpers.ts` (uses cache)
   - Return object with data array, found boolean, and optional metadata
   - Follow pattern from existing query tools

3. Import and add tool to Lucie agent in `src/mastra/agents/lucie-agent.ts`
   - Import: `import { myQuery } from '../tools/my-query';`
   - Add to tools object: `tools: { generalQuestionsQuery, sessionEventGridQuery, pioneerProfileBookQuery, myQuery }`

4. Update Lucie's instructions to describe when to use the new tool

5. Test with CLI: `pnpm dev:cli --agent lucie`

**Example Query Tool Structure:**
```typescript
export const myQuery = createTool({
  id: 'my-query',
  description: 'Query description',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  outputSchema: z.object({
    results: z.array(z.any()).describe('Matching results'),
    found: z.boolean().describe('Whether results were found'),
  }),
  execute: async ({ query }) => {
    const data = loadJsonData('my-data.json');
    // Search logic here
    return { results: [...], found: results.length > 0 };
  },
});
```

## Adding a New Slack App

1. Create agent file in `src/mastra/agents/{name}-agent.ts`
2. Define agent with tools/workflows and memory
3. Import and register in `src/mastra/index.ts`: `agents: { myAgent }`
4. Add Slack app config to `slackApps` array in `src/mastra/slack/routes.ts`:
   ```typescript
   {
     name: 'my-agent',              // Route path
     botToken: process.env.SLACK_MY_AGENT_BOT_TOKEN!,
     signingSecret: process.env.SLACK_MY_AGENT_SIGNING_SECRET!,
     agentName: 'myAgent',          // Must match key in mastra.agents
   }
   ```
5. Create Slack app at api.slack.com/apps with required scopes:
   - `app_mentions:read`, `channels:history`, `chat:write`, `im:history`
6. Configure Event Subscriptions with webhook URL: `https://your-server.com/slack/my-agent/events`
7. Subscribe to bot events: `app_mention`, `message.im`
8. Enable "Agents & AI Apps" toggle in Slack app settings
9. Add credentials to `.env`

## Streaming State Management

The streaming system tracks state via `StreamState`:
- `text`: Accumulated response text
- `chunkType`: Current event type (affects spinner display)
- `toolName`: Name of currently executing tool
- `workflowName`: Name of executing workflow
- `stepName`: Current workflow step

Status display logic in `src/mastra/slack/status.ts` uses these states to show contextual spinners.

## Important Notes

- Bot messages and message edits are automatically ignored (checks for `bot_id` and `subtype`)
- Thread context is preserved using Slack's `thread_ts` field for Lucie's memory
- Animation timing is configurable via constants in `src/mastra/slack/constants.ts`
- Workflow events are nested in `tool-output` chunks and require special extraction logic
- **Phase 3 Architecture:** Single agent (Lucie) with direct tool usage
  - Lucie maintains conversation memory (20 messages)
  - Memory enables natural follow-up questions and contextual understanding
  - No routing layer - Lucie intelligently chooses the right query tool
  - 1 LLM call per query (85-90% faster than original architecture)
- Data files in `data/` directory are loaded once and cached in memory by `data-helpers.ts`
- Use `clearDataCache()` from `data-helpers.ts` when JSON files are updated during development
