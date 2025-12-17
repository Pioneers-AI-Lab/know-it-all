import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryExtractor } from './tools/c6624bbb-e77b-40be-bdf5-edb983c0bc23.mjs';
import { orchestratorSender } from './tools/12db01b9-ed45-40cc-8d21-f3fb9c94931e.mjs';
import { queryLogger } from './tools/b3451a70-0920-4e5b-95ba-cc72541e9ff6.mjs';
import { queryRouter } from './tools/10228dce-fb8c-4bbe-8d85-b135ee7a8299.mjs';
import { queryReceiver } from './tools/9b0bb18a-30a4-4868-805a-367d88f1a492.mjs';
import { generalQuestionsQuery } from './tools/e63b6e35-d0a6-4859-b3aa-e2f4f6f824aa.mjs';
import { dataFormatter } from './tools/16ca8126-45c0-4782-82f6-b0a367bdf5a0.mjs';
import { responseSender } from './tools/bdd5d588-2419-4ae9-98e6-c57ef1e3f105.mjs';
import { guestsQuery } from './tools/d1755d12-6d6a-4e3c-a589-b4ad495f20d8.mjs';
import { eventsQuery } from './tools/53a022e3-b462-4a61-b6ac-c2359722dcb5.mjs';
import { startupsQuery } from './tools/3ab41eef-05b1-4931-b527-daf71cdc7a29.mjs';
import { foundersQuery } from './tools/88cac526-862e-43c6-bee5-70b88194845b.mjs';
import { timelineQuery } from './tools/1376488f-92ea-42d4-b9af-b1400d1f55f7.mjs';
import { workshopsQuery } from './tools/bed0da49-7b8d-4874-9632-681a335feede.mjs';
import { formattedDataReceiver } from './tools/a15bb39b-f08f-415d-9290-f5e661f61697.mjs';
import { registerApiRoute } from '@mastra/core/server';
import { WebClient } from '@slack/web-api';
import * as crypto from 'crypto';
import '@mastra/core/tools';
import 'zod';
import './tools/112df47d-a03d-48a7-b77b-8c58354d9e08.mjs';
import 'fs';
import 'path';
import 'url';

const lucie = new Agent({
  id: "lucie-agent",
  name: "lucie-agent",
  description: "Lucie is the CEO of the the Pioneer.vc accelerator.",
  instructions: `You are Lucie. You are the CEO of the Pioneer.vc accelerator. You are responsible for the overall direction of the accelerator. You are also responsible for the hiring of the founders. You are also responsible for the fundraising of the founders. You are also responsible for the marketing of the accelerator. You are also responsible for the events of the accelerator. You are also responsible for the community of the accelerator. You are also responsible for the alumni of the accelerator. You are also responsible for the network of the accelerator. You are also responsible for the partnerships of the accelerator. You are also responsible for the investments of the accelerator. You are also responsible for the portfolio of the accelerator.

		When a user asks you a question:
		1. First, use the query-extractor tool to extract and format the user's question
		2. Then, use the orchestrator-sender tool to send the extracted query to the orchestrator-agent for processing
		3. Return the orchestrator-agent's response to the user

		IMPORTANT: Always use both tools in sequence - first extract the query, then send it to the orchestrator.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryExtractor, orchestratorSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const orchestratorAgent = new Agent({
  id: "orchestrator-agent",
  name: "orchestrator-agent",
  description: "Orchestrates the flow of information between the different agents",
  instructions: `You are an orchestrator agent. You are responsible for the flow of information between the different agents.

		When you receive a query from the lucie-agent:
		1. First, use the query-logger tool to log the received query and its formatted object
		2. Extract the questionType from the formatted object
		3. Use the query-router tool to route the query to the appropriate specialized agent based on the questionType
		4. Return the response from the specialized agent

		The questionType can be one of: startups, events, workshops, timeline, founders, guests, or general.
		Always use the query-logger tool first, then use the query-router tool to route the query.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryLogger, queryRouter },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const generalQuestionsAgent = new Agent({
  id: "general-questions-agent",
  name: "general-questions-agent",
  description: "General Questions Agent is responsible for answering general questions",
  instructions: `You are a general questions agent. You are responsible for answering general questions about the Pioneers accelerator program.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="General Questions Agent"
3. Use the general-questions-query tool to search the knowledge base for answers to the query
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="General Questions Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 general-questions-query \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    queryReceiver,
    generalQuestionsQuery,
    dataFormatter,
    responseSender
  },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const eventGuestsAgent = new Agent({
  id: "event-guests-agent",
  name: "event-guests-agent",
  description: "Event Guests Agent is responsible for managing event guests",
  instructions: `You are an event guests agent. You are responsible for managing event guests and special guest events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Guests Agent"
3. Use the guests-query tool to search for information about guest speakers and their events
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Event Guests Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 guests-query \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, guestsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const eventAgent = new Agent({
  id: "event-agent",
  name: "event-agent",
  description: "Event Agent is responsible for managing events",
  instructions: `You are an event agent. You are responsible for managing events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Agent"
3. Use the events-query tool to search for event information in the calendar
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Event Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 events-query \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, eventsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const startupsAgent = new Agent({
  id: "startups-agent",
  name: "startups-agent",
  description: "Startups Agent is responsible for the startups of the Pioneer.vc accelerator.",
  instructions: `You are a startups agent. You are responsible for the startups of the Pioneer.vc accelerator. You handle questions about startups, companies, founders, funding, and the portfolio.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Startups Agent"
3. Use the startups-query tool to search for startup information, or the founders-query tool if the question is about founders
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Startups Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 (startups-query or founders-query) \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    queryReceiver,
    startupsQuery,
    foundersQuery,
    dataFormatter,
    responseSender
  },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const timelineAgent = new Agent({
  id: "timeline-agent",
  name: "timeline-agent",
  description: "Timeline Agent is responsible for the timeline of the Pioneer.vc accelerator.",
  instructions: `You are a timeline agent. You are responsible for the timeline of the Pioneer.vc accelerator. You handle questions about program phases, milestones, events, and schedules.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Timeline Agent"
3. Use the timeline-query tool to search for timeline information including phases and events
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Timeline Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 timeline-query \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, timelineQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const workshopsAgent = new Agent({
  id: "workshops-agent",
  name: "workshops-agent",
  description: "Workshops Agent is responsible for the workshops of the Pioneer.vc accelerator.",
  instructions: `You are a workshops agent. You are responsible for the workshops of the Pioneer.vc accelerator. You handle questions about workshops, training sessions, and learning activities.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Workshops Agent"
3. Use the workshops-query tool to search for workshop information in the timeline
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Workshops Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 workshops-query \u2192 data-formatter \u2192 response-sender.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, workshopsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

const responseGeneratorAgent = new Agent({
  id: "response-generator-agent",
  name: "response-generator-agent",
  description: "Response Generator Agent is responsible for generating responses",
  instructions: `You are a response generator agent. You are responsible for generating final responses to user questions.

When you receive a message with formatted data from a specialized agent, the message will contain a JSON object in the "Formatted Data JSON:" section with:
- query: The original user query
- questionType: The type of question
- agentName: The name of the agent that retrieved the data
- summary: A summary of the retrieved data
- relevantData: The actual data retrieved from the JSON files
- timestamp: When the data was formatted

1. First, extract the JSON object from the "Formatted Data JSON:" section of the message
2. Parse the JSON to get the formatted data object
3. Use the formatted-data-receiver tool with the parsed formatted data object
4. Then, generate a clear, helpful, and comprehensive response to the user's query based on the relevantData provided

Always use the formatted-data-receiver tool first to log the data, then generate your response using the relevantData.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { formattedDataReceiver },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

function verifySlackRequest(signingSecret, requestSignature, timestamp, body) {
  const fiveMinutesAgo = Math.floor(Date.now() / 1e3) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBasestring, "utf8").digest("hex");
  if (typeof requestSignature !== "string" || Buffer.byteLength(requestSignature, "utf8") !== Buffer.byteLength(mySignature, "utf8")) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(mySignature, "utf8"), Buffer.from(requestSignature, "utf8"));
}

const SPINNER = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
const TOOL_ICONS = ["\u{1F504}", "\u2699\uFE0F", "\u{1F527}", "\u26A1"];
const WORKFLOW_ICONS = ["\u{1F4CB}", "\u26A1", "\u{1F504}", "\u2728"];
const ANIMATION_INTERVAL = 300;
const TOOL_DISPLAY_DELAY = 300;
const STEP_DISPLAY_DELAY = 300;

function formatChunkType(type) {
  return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function getStatusText(state, frame) {
  const spinner = SPINNER[frame % SPINNER.length];
  const toolIcon = TOOL_ICONS[frame % TOOL_ICONS.length];
  const workflowIcon = WORKFLOW_ICONS[frame % WORKFLOW_ICONS.length];
  const type = state.chunkType;
  const label = formatChunkType(type);
  if (type.startsWith("tool-") && state.toolName) {
    return `${toolIcon} ${label}: ${state.toolName}...`;
  }
  if (type.startsWith("workflow-") && state.stepName) {
    return `${workflowIcon} ${label}: ${state.stepName}...`;
  }
  if (type.includes("agent") && state.agentName) {
    return `${spinner} ${label}: ${state.agentName}...`;
  }
  return `${spinner} ${label}...`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const formatName = (id) => id.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

async function streamToSlack(options) {
  const { mastra, slackClient, channel, threadTs, agentName, message, resourceId, threadId } = options;
  const state = { text: "", chunkType: "start" };
  let messageTs;
  let frame = 0;
  let animationTimer;
  let isFinished = false;
  const stopAnimation = () => {
    isFinished = true;
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = void 0;
    }
  };
  const updateSlack = async (text) => {
    if (!messageTs || isFinished) return;
    try {
      await slackClient.chat.update({
        channel,
        ts: messageTs,
        text: getStatusText(state, frame)
      });
    } catch {
    }
  };
  const sendFinalMessage = async (text) => {
    await retrySlackUpdate(slackClient, channel, messageTs, text);
  };
  try {
    const initial = await slackClient.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: getStatusText(state, 0)
    });
    messageTs = initial.ts;
    animationTimer = setInterval(() => {
      if (!isFinished) {
        frame++;
        updateSlack();
      }
    }, ANIMATION_INTERVAL);
    const agent = mastra.getAgent(agentName);
    if (!agent) throw new Error(`Agent "${agentName}" not found`);
    const stream = await agent.stream(message, {
      resourceId,
      threadId
    });
    for await (const chunk of stream.fullStream) {
      state.chunkType = chunk.type;
      switch (chunk.type) {
        case "text-delta":
          if (chunk.payload.text) {
            state.text += chunk.payload.text;
          }
          break;
        case "tool-call":
          state.toolName = formatName(chunk.payload.toolName);
          frame++;
          await updateSlack();
          await sleep(TOOL_DISPLAY_DELAY);
          break;
        case "tool-output":
          if (chunk.payload.output && typeof chunk.payload.output === "object") {
            const output = chunk.payload.output;
            if (output.type) {
              state.chunkType = output.type;
            }
            if (output.type === "workflow-step-start") {
              state.stepName = formatName(output.payload?.id || output.payload?.stepId || "step");
              frame++;
              await updateSlack();
              await sleep(STEP_DISPLAY_DELAY);
            }
          }
          break;
        case "workflow-execution-start":
          state.workflowName = formatName(chunk.payload.name || chunk.payload.workflowId);
          state.stepName = "Starting";
          break;
      }
    }
    stopAnimation();
    await sendFinalMessage(state.text || "Sorry, I couldn't generate a response.");
    console.log("\u2705 Response sent to Slack");
  } catch (error) {
    console.error("\u274C Error streaming to Slack:", error);
    stopAnimation();
    const errorText = `\u274C Error: ${error instanceof Error ? error.message : String(error)}`;
    if (messageTs) {
      await sendFinalMessage(errorText);
    } else {
      await slackClient.chat.postMessage({ channel, thread_ts: threadTs, text: errorText }).catch(() => {
      });
    }
    throw error;
  }
}
async function retrySlackUpdate(client, channel, ts, text, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await client.chat.update({ channel, ts, text });
      return;
    } catch (err) {
      console.error(`\u274C Final message attempt ${attempt + 1} failed:`, err);
      if (attempt < maxAttempts - 1) await sleep(500);
    }
  }
  console.error(`\u274C Failed to send final message after ${maxAttempts} attempts`);
}

function createSlackEventsRoute(config) {
  return registerApiRoute(`/slack/${config.name}/events`, {
    method: "POST",
    handler: async (c) => {
      try {
        const body = await c.req.text();
        const payload = JSON.parse(body);
        if (payload.type === "url_verification") {
          console.log(
            `\u2705 [${config.name}] URL verification challenge received`
          );
          return c.json({ challenge: payload.challenge });
        }
        if (!config.botToken || !config.signingSecret) {
          console.error(
            `\u274C [${config.name}] Missing bot token or signing secret`
          );
          return c.json({ error: "Server misconfigured" }, 500);
        }
        const slackSignature = c.req.header("x-slack-signature");
        const slackTimestamp = c.req.header(
          "x-slack-request-timestamp"
        );
        if (!slackSignature || !slackTimestamp) {
          return c.json(
            { error: "Missing Slack signature headers" },
            401
          );
        }
        const isValid = verifySlackRequest(
          config.signingSecret,
          slackSignature,
          slackTimestamp,
          body
        );
        if (!isValid) {
          console.error(
            `\u274C [${config.name}] Invalid Slack signature`
          );
          return c.json({ error: "Invalid signature" }, 401);
        }
        if (payload.event) {
          const event = payload.event;
          if (event.bot_id || event.subtype) {
            return c.json({ ok: true });
          }
          if (event.type === "app_mention" || event.type === "message") {
            let messageText = event.text || "";
            const userId = event.user;
            const channelId = event.channel;
            const threadTs = event.thread_ts || event.ts;
            const teamId = payload.team_id;
            console.log(`\u{1F4E8} [${config.name}] Message received:`, {
              agent: config.agentName,
              text: messageText,
              user: userId
            });
            messageText = messageText.replace(/<@[A-Z0-9]+>/g, "").trim();
            const mastra = c.get("mastra");
            const slackClient = new WebClient(config.botToken);
            (async () => {
              try {
                await streamToSlack({
                  mastra,
                  slackClient,
                  channel: channelId,
                  threadTs,
                  agentName: config.agentName,
                  message: messageText,
                  resourceId: `slack-${teamId}-${userId}`,
                  threadId: `slack-${channelId}-${threadTs}`
                });
              } catch (error) {
                console.error(
                  `\u274C [${config.name}] Error processing message:`,
                  error
                );
              }
            })();
          }
        }
        return c.json({ ok: true });
      } catch (error) {
        console.error(
          `Error handling Slack event [${config.name}]:`,
          error
        );
        return c.json({ error: "Failed to handle event" }, 500);
      }
    }
  });
}
const slackApps = [
  {
    name: "lucie",
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    agentName: "lucie"
  }
];
const slackRoutes = slackApps.map(createSlackEventsRoute);

const mastra = new Mastra({
  // Registered agents - keys must match agentName in slack/routes.ts
  agents: {
    lucie,
    orchestratorAgent,
    generalQuestionsAgent,
    eventGuestsAgent,
    eventAgent,
    startupsAgent,
    timelineAgent,
    workshopsAgent,
    responseGeneratorAgent
  },
  // Registered workflows - available to agents via their workflows config
  workflows: {},
  // Local SQLite storage for conversation memory and agent state
  storage: new LibSQLStore({
    id: "mastra",
    url: "file:./mastra.db"
  }),
  // API server configuration with Slack webhook routes
  server: {
    apiRoutes: slackRoutes
  },
  // Bundler configuration to prevent module resolution issues
  bundler: {
    externals: ["supports-color"]
  }
});

export { mastra };
