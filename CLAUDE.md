# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Slack bot framework built on Mastra that connects AI agents to Slack workspaces. This project implements a **simplified single-agent architecture** where Lucie directly answers user queries about the Pioneer.vc accelerator using specialized query tools. Features streaming responses, thread-based conversation memory, and a knowledge base backed by JSON data files.

**Note:** Legacy agent and tool files remain in the codebase (general-questions-agent, pioneer-profile-book-agent, session-event-grid-agent, query-extractor, specialized-agent-router) but are not registered in `src/mastra/index.ts` and are not used in the current architecture.

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

## Project Structure

```
├── data/                                    # JSON knowledge base files
│   ├── general-questions.json               # FAQ data
│   ├── session_event_grid_view.json         # Events/sessions data
│   └── pioneers_profile_book_su2025.json    # Pioneer profiles
├── src/
│   ├── lib/
│   │   └── print-helpers.ts                 # Console logging utilities
│   └── mastra/
│       ├── index.ts                         # Main Mastra instance config
│       ├── agents/
│       │   ├── lucie-agent.ts               # Active: Main agent
│       │   ├── general-questions-agent.ts   # Legacy: Not registered
│       │   ├── pioneer-profile-book-agent.ts # Legacy: Not registered
│       │   └── session-event-grid-agent.ts  # Legacy: Not registered
│       ├── slack/
│       │   ├── routes.ts                    # Webhook route factory
│       │   ├── streaming.ts                 # Response streaming to Slack
│       │   ├── status.ts                    # Spinner/status formatting
│       │   ├── verify.ts                    # HMAC signature verification
│       │   ├── chunks.ts                    # Nested event extraction
│       │   ├── constants.ts                 # Animation timing config
│       │   ├── types.ts                     # TypeScript types
│       │   └── utils.ts                     # Helper utilities
│       ├── terminal/
│       │   ├── cli.ts                       # Local CLI testing interface
│       │   └── streaming.ts                 # Terminal output streaming
│       ├── tools/
│       │   ├── general-questions-query.ts   # Active: FAQ query tool
│       │   ├── session-event-grid-query.ts  # Active: Events query tool
│       │   ├── pioneer-profile-book-query.ts # Active: Profiles query tool
│       │   ├── data-helpers.ts              # JSON loading with cache
│       │   └── [legacy files...]            # Legacy: Various unused tools
│       └── workflows/
│           └── reverse-workflow.ts          # Legacy: Not registered
├── .mastra/
│   ├── output/                              # Built application
│   └── bundler-config.mjs                   # Build configuration
├── mastra.db                                # SQLite database for memory
├── package.json                             # Dependencies and scripts
└── tsconfig.json                            # TypeScript configuration
```

## Architecture

### Simplified Single-Agent Architecture (Phase 3)

This codebase implements a **direct single-agent pattern** for query processing:

```
User → Lucie → Query Tool → Response
```

**Phase 3 Simplifications (40-50% faster than Phase 2):**
- ✅ Single agent architecture (Lucie handles all queries)
- ✅ Removed routing layer (query-extractor, specialized-agent-router files exist but unused)
- ✅ Removed specialized agents (agent files exist but not registered in mastra instance)
- ✅ Direct tool usage (Lucie chooses appropriate query tool)
- ✅ JSON data caching (in-memory Map cache, 10-20% faster disk I/O)
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
- `general-questions.json`: FAQ-style Q&A about the accelerator (structured as `knowledge_base` with categories)
- `session_event_grid_view.json`: Session and event schedule with details
- `pioneers_profile_book_su2025.json`: Pioneer profile book data

Tools use `data-helpers.ts` for loading and searching JSON data.

**Data Loading Optimization:**
- In-memory caching via `Map<string, any>` in `data-helpers.ts` eliminates repeated disk reads
- JSON files loaded once per process lifetime on first access
- Cache persists across multiple queries
- Use `clearDataCache()` during development when data files change
- Path resolution tries multiple locations (project root, .mastra/output, etc.)
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
- Currently only one active agent: Lucie (`lucie-agent.ts`)
- Lucie uses Claude Sonnet 4 (`anthropic/claude-sonnet-4-20250514`)
- Has Memory with `lastMessages: 20` for full conversation context
- Handles all Pioneer.vc accelerator queries
- Intelligently selects appropriate query tools based on user questions
- Generates responses directly without routing to other agents
- Memory enables natural follow-up questions and contextual understanding
- Response format: Slack-friendly with *bold*, emoji, bullet points, conversational tone
- Avoids heavy markdown (no headers, code blocks, or tables) for better Slack readability
- Legacy agent files exist (`general-questions-agent.ts`, `pioneer-profile-book-agent.ts`, `session-event-grid-agent.ts`) but are not registered or used

**Tools** (`src/mastra/tools/`)
- Created with `createTool()` from `@mastra/core/tools`
- Define input/output schemas with Zod
- Execute function receives typed inputs from schema and execution context
- Active query tools (registered with Lucie):
  - `general-questions-query.ts`: Searches general-questions.json for FAQ answers
  - `session-event-grid-query.ts`: Searches session_event_grid_view.json for events/sessions
  - `pioneer-profile-book-query.ts`: Searches pioneers_profile_book_su2025.json for pioneer profiles
- All query tools use `data-helpers.ts` for cached data loading
- Tools return structured data with `found` flag and optional metadata
- Legacy tools exist but unused: `query-extractor.ts`, `specialized-agent-router.ts`, `query-receiver.ts`, `query-router.ts`, `data-formatter.ts`, `formatted-data-receiver.ts`, `query-logger.ts`

**Workflows** (`src/mastra/workflows/`)
- Currently no active workflows registered in mastra instance
- Legacy workflow exists: `reverse-workflow.ts` (not used)
- Multi-step workflows use `createWorkflow` and `createStep` pattern
- Each step has input/output schemas defined with Zod
- Steps are chained using `.then()` and finalized with `.commit()`
- Workflow execution generates `workflow-execution-start` and `workflow-step-start` events

## Environment Variables

Required for Lucie agent:
```bash
# Anthropic API key for Claude Sonnet 4 (used by Lucie agent)
ANTHROPIC_API_KEY=sk-ant-...

# Slack credentials for Lucie bot
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

**Note:** The code references `OPENAI_API_KEY` in some places but Lucie agent uses `anthropic/claude-sonnet-4-20250514` which requires `ANTHROPIC_API_KEY`.

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

## Debugging and Development

**Local Testing Without Slack:**
- Use `pnpm dev:cli` or `pnpm dev:cli --agent lucie` for terminal-based testing
- Terminal CLI supports full conversation memory and multi-turn interactions
- Faster iteration than testing through Slack webhooks
- Located in `src/mastra/terminal/cli.ts`

**Data Cache Management:**
- JSON data files are cached in memory on first load
- Cache persists for process lifetime
- During development, restart the server to reload changed data files
- Or call `clearDataCache()` from `data-helpers.ts` programmatically

**Build Process:**
- `pnpm dev` runs Mastra dev server with hot reload on port 4111
- `pnpm build` bundles to `.mastra/output/`
- Build externalizes `supports-color` to prevent bundler issues
- Built output includes compiled agents, tools, and routes

**Database:**
- LibSQL (SQLite) database at `./mastra.db`
- Stores conversation memory and thread context
- Can be deleted to reset all memory state
- Conversation context keyed by `threadId` and `resourceId`

## Important Notes

- Bot messages and message edits are automatically ignored (checks for `bot_id` and `subtype`)
- Thread context is preserved using Slack's `thread_ts` field for Lucie's memory
  - `threadId` format: `slack-{channelId}-{threadTs}`
  - `resourceId` format: `slack-{teamId}-{userId}`
- Animation timing is configurable via constants in `src/mastra/slack/constants.ts`
- Workflow events are nested in `tool-output` chunks and require special extraction logic
- **Phase 3 Architecture:** Single agent (Lucie) with direct tool usage
  - Lucie maintains conversation memory (20 messages)
  - Memory enables natural follow-up questions and contextual understanding
  - No routing layer - Lucie intelligently chooses the right query tool
  - 1 LLM call per query (85-90% faster than original architecture)
- Data files in `data/` directory are loaded once and cached in memory by `data-helpers.ts`
- Use `clearDataCache()` from `data-helpers.ts` when JSON files are updated during development
- Legacy code (unused agents, tools, workflows) remains in codebase but is not registered in `src/mastra/index.ts`
