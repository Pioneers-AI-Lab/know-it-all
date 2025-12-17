import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryExtractor } from './tools/b4da184b-c8d0-4644-bd9e-958f8af51ae2.mjs';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { queryLogger } from './tools/aed65319-01f6-40fe-a263-8d29822d61c9.mjs';
import { queryReceiver } from './tools/9743a6c0-887f-4694-a419-5baa6c1336cd.mjs';
import { generalQuestionsQuery } from './tools/f77c6fd7-b753-423b-9e16-25bf45909d37.mjs';
import { guestsQuery } from './tools/d6a90b68-f5d0-4617-b935-0817f3e39613.mjs';
import { eventsQuery } from './tools/13cb3865-76ef-4c5d-895d-601a1ced1085.mjs';
import { startupsQuery } from './tools/60e767b6-a2e9-4af6-8ad3-f194508ffc0f.mjs';
import { foundersQuery } from './tools/6b88e06a-0ee6-4c99-ab6f-acbae57057bd.mjs';
import { timelineQuery } from './tools/dc8c5950-810c-4c08-b93a-b492570e3dd8.mjs';
import { workshopsQuery } from './tools/1e41e65e-23b2-43f9-ab43-745f4a31aa77.mjs';
import { registerApiRoute } from '@mastra/core/server';
import { WebClient } from '@slack/web-api';
import * as crypto from 'crypto';

const orchestratorSender = createTool({
  id: "orchestrator-sender",
  description: "Sends an extracted query to the orchestrator-agent for routing and processing",
  inputSchema: z.object({
    query: z.string().describe("The extracted query to send to the orchestrator"),
    formatted: z.object({
      question: z.string(),
      type: z.string(),
      timestamp: z.string()
    }).describe("The formatted JSON object containing the question")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the query was successfully sent"),
    response: z.string().describe("The response from the orchestrator-agent")
  }),
  execute: async ({
    query,
    formatted
  }) => {
    const orchestratorAgent = mastra.getAgent("orchestratorAgent");
    if (!orchestratorAgent) {
      throw new Error("Orchestrator agent not found");
    }
    const message = `Process this query: ${query}

Formatted query object: ${JSON.stringify(
      formatted,
      null,
      2
    )}`;
    const response = await orchestratorAgent.generate(message);
    return {
      success: true,
      response: response.text || JSON.stringify(response)
    };
  }
});

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

const queryRouter = createTool({
  id: "query-router",
  description: "Routes a query to the appropriate specialized agent based on the question type",
  inputSchema: z.object({
    query: z.string().describe("The query to route to a specialized agent"),
    questionType: z.enum([
      "startups",
      "events",
      "workshops",
      "timeline",
      "founders",
      "guests",
      "general"
    ]).describe(
      "The type of question determining which agent to route to"
    )
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the query was successfully routed"),
    agentName: z.string().describe("The name of the agent that handled the query"),
    response: z.string().describe("The response from the specialized agent")
  }),
  execute: async ({
    query,
    questionType
  }) => {
    const agentMapping = {
      startups: {
        agentName: "startupsAgent",
        displayName: "Startups Agent"
      },
      events: {
        agentName: "eventAgent",
        displayName: "Event Agent"
      },
      workshops: {
        agentName: "workshopsAgent",
        displayName: "Workshops Agent"
      },
      timeline: {
        agentName: "timelineAgent",
        displayName: "Timeline Agent"
      },
      founders: {
        agentName: "startupsAgent",
        // Founders are handled by startups agent
        displayName: "Startups Agent"
      },
      guests: {
        agentName: "eventGuestsAgent",
        displayName: "Event Guests Agent"
      },
      general: {
        agentName: "generalQuestionsAgent",
        displayName: "General Questions Agent"
      }
    };
    const mapping = agentMapping[questionType];
    if (!mapping) {
      throw new Error(
        `No agent mapping found for question type: ${questionType}`
      );
    }
    const specializedAgent = mastra.getAgent(
      mapping.agentName
    );
    if (!specializedAgent) {
      throw new Error(
        `Specialized agent "${mapping.agentName}" not found`
      );
    }
    const message = `Question Type: ${questionType}

Query: ${query}`;
    const response = await specializedAgent.generate(message);
    return {
      success: true,
      agentName: mapping.displayName,
      response: response.text || JSON.stringify(response)
    };
  }
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the general-questions-query tool to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, generalQuestionsQuery },
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the guests-query tool to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, guestsQuery },
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the events-query tool to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, eventsQuery },
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the appropriate query tool (startups-query or founders-query) to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, startupsQuery, foundersQuery },
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the timeline-query tool to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, timelineQuery },
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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the workshops-query tool to find relevant information.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, workshopsQuery },
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
    workshopsAgent
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

export { mastra as m, orchestratorSender as o, queryRouter as q };
