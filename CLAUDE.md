# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Slack bot framework built on Mastra that connects AI agents to Slack workspaces. The architecture supports multiple Slack apps, each mapped to a distinct Mastra agent, with streaming responses and thread-based conversation memory.

## Key Commands

```bash
# Development (runs Mastra dev server on port 4111)
pnpm dev

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

### Multi-App Pattern

The system uses a one-to-one mapping: **1 Slack App = 1 Mastra Agent = 1 Webhook Route**

Each Slack app configuration in `src/mastra/slack/routes.ts` creates:
- A webhook endpoint at `/slack/{name}/events`
- A dedicated Slack bot with its own credentials
- A connection to a specific Mastra agent

Example flow:
```
Slack message → /slack/reverse/events → reverseAgent → streaming response
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

**Request Verification** (`src/mastra/slack/verify.ts`)
- Validates Slack request signatures using HMAC SHA256
- Rejects requests older than 5 minutes
- Uses timing-safe comparison to prevent timing attacks

**Agents** (`src/mastra/agents/`)
- Each agent has its own Mastra Agent instance with Memory
- Agents can have tools, workflows, or both
- Memory configuration: `lastMessages: 20` for conversation context
- Agent instructions should specify when to use tools vs. workflows

**Workflows** (`src/mastra/workflows/`)
- Multi-step workflows using `createWorkflow` and `createStep`
- Each step has input/output schemas defined with Zod
- Steps are chained using `.then()` and finalized with `.commit()`
- Workflow execution generates `workflow-execution-start` and `workflow-step-start` events

## Environment Variables

Required per Slack app:
```bash
OPENAI_API_KEY=sk-...

SLACK_{APP_NAME}_BOT_TOKEN=xoxb-...
SLACK_{APP_NAME}_SIGNING_SECRET=...
```

Convention: Use uppercase snake_case for app names in env vars (e.g., `SLACK_REVERSE_BOT_TOKEN`)

## Adding a New Agent

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
