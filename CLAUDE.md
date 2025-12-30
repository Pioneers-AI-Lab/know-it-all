# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Slack bot framework built on Mastra that connects AI agents to Slack workspaces. This project implements a **multi-agent pipeline architecture** where a primary agent (Lucie) routes user queries through specialized agents for Pioneer.vc accelerator questions. Features streaming responses, thread-based conversation memory, and a knowledge base backed by JSON data files.

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

### Multi-Agent Pipeline Architecture (Phase 2 Optimized)

This codebase implements an **optimized direct-routing pattern** for query processing:

```
User → Lucie (entry) → Query Extractor → Specialized Agent Router → Specialized Agent → User
```

**Phase 2 Optimizations (70-80% faster):**
- ✅ Removed orchestrator-agent (eliminates 1-2 LLM calls)
- ✅ Removed response-generator-agent (specialized agents format responses directly)
- ✅ Simplified specialized agents (1 tool instead of 4 sequential tools)
- ✅ Direct routing from Lucie to specialized agents with context preservation
- ✅ JSON data caching (10-20% faster disk I/O)
- ✅ Haiku 3.5 for specialized agents (2-3x faster than Sonnet 4)
- ✅ Optimized memory: 10 messages for specialized agents (maintains context)
- ✅ Context-enrichment pattern: Lucie adds relevant history to follow-up questions

**Pipeline Flow:**

1. **Lucie Agent** (`src/mastra/agents/lucie-agent.ts`)
   - Entry point for all user queries via Slack
   - Uses Claude Sonnet 4 (user-facing, needs high intelligence)
   - Uses `queryExtractor` tool to parse and classify questions
   - Uses `specializedAgentRouter` tool to directly route to specialized agents
   - Returns specialized agent's response to user

2. **Query Extractor Tool** (`src/mastra/tools/query-extractor.ts`)
   - Parses natural language messages using regex (fast, no LLM)
   - Classifies into types: `startups`, `events`, `founders`, `pioneers`, `general`
   - Returns structured query object with type and timestamp

3. **Specialized Agent Router Tool** (`src/mastra/tools/specialized-agent-router.ts`)
   - Direct routing to specialized agents (no LLM, just mapping logic)
   - Replaces orchestrator-agent and query-router tool
   - Maps question types to agent names and invokes them directly

4. **Specialized Agents** (`src/mastra/agents/`)
   - `startups-agent.ts`: Company and portfolio queries
   - `founders-agent.ts`: Founder-specific information
   - `calendar-agent.ts`: Event information
   - `pioneer-profile-book-agent.ts`: Pioneer profile book queries
   - `general-questions-agent.ts`: General accelerator questions
   - Each uses Claude Haiku 3.5 (fast, cost-effective for data lookup)
   - Each uses a single query tool and generates responses directly
   - Memory set to last 10 messages (maintains context for follow-up questions)
   - Receives threadId/resourceId to maintain conversation continuity

**Key Pattern:** Direct agent-to-agent routing via `mastra.getAgent(name).generate()` with minimal intermediary steps.

**Performance:**
- Before: 5-7 LLM calls per query (~8-12 seconds)
- After Phase 1: 5-7 LLM calls with caching + Haiku (~6-8 seconds, 20-30% faster)
- After Phase 2: 2-3 LLM calls (~2-4 seconds, 70-80% faster overall)

### Knowledge Base Structure

Data is stored in JSON files under `data/`:
- `startups.json`: Company profiles, founders, funding, industries
- `founders.json`: Individual founder information
- `calendar-events.json`: Event schedule and details
- `general-questions.json`: FAQ-style general information
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
- Each agent has its own Mastra Agent instance with Memory
- Agents can have tools, workflows, or both
- Memory configuration:
  - Lucie: `lastMessages: 20` (user-facing, needs full conversation context)
  - Specialized agents: `lastMessages: 10` (maintains context for same-agent follow-ups)
- Context-enrichment pattern: Lucie enriches follow-up queries with relevant conversation context before routing
  - Detects reference words ("the first", "those", "them", etc.)
  - Adds brief context from previous responses to the query
  - Example: "Tell me about the first two" → "Tell me about the first two startups from the 12 in the accelerator"
- Agent instructions should specify when to use tools vs. workflows
- Phase 2 optimization: Specialized agents generate responses directly (no intermediate agents)

**Tools** (`src/mastra/tools/`)
- Created with `createTool()` from `@mastra/core/tools`
- Define input/output schemas with Zod
- Execute function receives typed inputs from schema and execution context
- Tools can invoke other agents via `mastra.getAgent(name).generate(query, { threadId, resourceId })`
- Key tools:
  - `query-extractor.ts`: Classification via regex (no LLM)
  - `specialized-agent-router.ts`: Direct routing to specialized agents with context preservation
  - `{domain}-query.ts`: Data lookup from cached JSON files
- Context-aware routing: specializedAgentRouter passes threadId/resourceId to maintain conversation memory
- Phase 2 removed: queryReceiver, dataFormatter, responseSender, orchestratorSender, queryRouter

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

## Adding a New Specialized Agent (Phase 2 Pattern)

1. Create agent file in `src/mastra/agents/{name}-agent.ts`
   - Use Claude Haiku 3.5 model: `model: 'anthropic/claude-3-5-haiku-20241022'`
   - Set memory to 10 messages: `lastMessages: 10` (maintains context for follow-ups)
   - Include only the query tool (no queryReceiver, dataFormatter, responseSender)
   - Agent should generate final user response directly

2. Create corresponding query tool in `src/mastra/tools/{name}-query.ts`
   - Load data via `loadJsonData()` from `data-helpers.ts` (uses cache)
   - Return object with data array, found boolean, and optional metadata
   - Follow pattern from existing query tools

3. Add data file in `data/{name}.json` if needed

4. Import and register agent in `src/mastra/index.ts`: `agents: { myAgent }`

5. Add questionType mapping in `src/mastra/tools/query-extractor.ts`
   - Add keywords to `dataTypeKeywords` object
   - Add enum value to questionType

6. Add routing case in `src/mastra/tools/specialized-agent-router.ts`
   - Add entry to `agentMapping` object

7. Test with CLI: `pnpm dev:cli --agent myAgent`

**Example Agent Structure:**
```typescript
export const myAgent = new Agent({
  id: 'my-agent',
  name: 'my-agent',
  model: 'anthropic/claude-3-5-haiku-20241022',
  tools: { myQuery },  // Single query tool only
  memory: new Memory({ options: { lastMessages: 10 } }),
  instructions: `Use the my-query tool to search data, then generate a clear response directly to the user.`
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
- **Phase 2:** Specialized agents are invoked directly by Lucie via specializedAgentRouter (no orchestrator)
- **Context handling:** Lucie uses context-enrichment pattern for follow-up questions
  - Lucie maintains conversation memory (20 messages)
  - When routing follow-ups, Lucie adds relevant context to the query itself
  - Specialized agents get self-contained queries that don't require shared thread context
- Data files in `data/` directory are loaded once and cached in memory by `data-helpers.ts`
- Use `clearDataCache()` from `data-helpers.ts` when JSON files are updated during development
