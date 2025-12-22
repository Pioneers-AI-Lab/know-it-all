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

### Multi-Agent Pipeline Architecture

This codebase implements a **hub-and-spoke pattern** for query processing:

```
User → Lucie (entry) → Query Extractor → Orchestrator Sender →
  Orchestrator Agent → Query Router → Specialized Agent →
  Response Generator → User
```

**Pipeline Flow:**

1. **Lucie Agent** (`src/mastra/agents/lucie-agent.ts`)
   - Entry point for all user queries via Slack
   - Uses `queryExtractor` tool to parse and classify questions
   - Uses `orchestratorSender` tool to forward to orchestrator
   - Returns orchestrator's response to user

2. **Query Extractor Tool** (`src/mastra/tools/query-extractor.ts`)
   - Parses natural language messages
   - Classifies into types: `startups`, `events`, `founders`, `general`
   - Returns structured query object with type and timestamp

3. **Orchestrator Agent** (`src/mastra/agents/orchestrator-agent.ts`)
   - Central routing hub using hub-and-spoke pattern
   - Logs incoming queries via `queryLogger`
   - Routes to specialized agents via `queryRouter` based on questionType

4. **Specialized Agents** (`src/mastra/agents/`)
   - `startups-agent.ts`: Company and portfolio queries
   - `founders-agent.ts`: Founder-specific information
   - `calendar-agent.ts`: Event information
   - `general-questions-agent.ts`: General accelerator questions
   - Each has dedicated query tools that read from `data/` JSON files

5. **Response Generator Agent** (`src/mastra/agents/response-generator-agent.ts`)
   - Formats final responses for users
   - Maintains consistent tone and language

**Key Pattern:** Agents communicate through tools, not direct calls. Specialized agents invoke each other via `mastra.getAgent(name).generate()`.

### Knowledge Base Structure

Data is stored in JSON files under `data/`:
- `startups.json`: Company profiles, founders, funding, industries
- `founders.json`: Individual founder information
- `calendar-events.json`: Event schedule and details
- `general-questions.json`: FAQ-style general information

Tools use `data-helpers.ts` for loading and searching JSON data.

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
- Memory configuration: `lastMessages: 20` for conversation context
- Agent instructions should specify when to use tools vs. workflows

**Tools** (`src/mastra/tools/`)
- Created with `createTool()` from `@mastra/core/tools`
- Define input/output schemas with Zod
- Execute function receives typed inputs from schema
- Tools can invoke other agents via `mastra.getAgent(name).generate()`
- Common patterns: query tools (data access), sender tools (agent communication), formatter tools (data transformation)

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

## Adding a New Specialized Agent

1. Create agent file in `src/mastra/agents/{name}-agent.ts`
2. Create corresponding query tool in `src/mastra/tools/{name}-query.ts`
3. Add data file in `data/{name}.json` if needed
4. Import and register agent in `src/mastra/index.ts`: `agents: { myAgent }`
5. Add questionType mapping in `src/mastra/tools/query-extractor.ts`
6. Add routing case in `src/mastra/tools/query-router.ts`
7. Test with CLI: `pnpm dev:cli --agent myAgent`

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
- Thread context is preserved using Slack's `thread_ts` field
- Animation timing is configurable via constants in `src/mastra/slack/constants.ts`
- Workflow events are nested in `tool-output` chunks and require special extraction logic
- Agent instructions should explicitly mention NOT to include conversation history when calling tools/workflows
- Agents communicate through tools using `mastra.getAgent(name).generate()` pattern
- All specialized agents are invoked by the orchestrator, not by Lucie directly
- Data files in `data/` directory are loaded synchronously by query tools using `data-helpers.ts`
