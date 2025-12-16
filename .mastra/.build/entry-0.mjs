import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { registerApiRoute } from '@mastra/core/server';
import { WebClient } from '@slack/web-api';
import * as crypto from 'crypto';

"use strict";
const analyzeStep = createStep({
  id: "analyze-text",
  description: "Analyzes the input text and extracts metadata",
  inputSchema: z.object({
    text: z.string()
  }),
  outputSchema: z.object({
    text: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  execute: async ({ inputData }) => {
    const { text } = inputData;
    const trimmed = text.trim();
    const wordCount = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    return {
      text,
      charCount: text.length,
      wordCount
    };
  }
});
const reverseStep = createStep({
  id: "reverse-text",
  description: "Reverses the text character by character",
  inputSchema: z.object({
    text: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  outputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  execute: async ({ inputData }) => {
    const { text, charCount, wordCount } = inputData;
    return {
      original: text,
      reversed: text.split("").reverse().join(""),
      charCount,
      wordCount
    };
  }
});
const uppercaseStep = createStep({
  id: "uppercase-text",
  description: "Converts the reversed text to uppercase",
  inputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  outputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    uppercased: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  execute: async ({ inputData }) => {
    const { original, reversed, charCount, wordCount } = inputData;
    return {
      original,
      reversed,
      uppercased: reversed.toUpperCase(),
      charCount,
      wordCount
    };
  }
});
const formatStep = createStep({
  id: "format-output",
  description: "Adds decorative formatting to the final result",
  inputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    uppercased: z.string(),
    charCount: z.number(),
    wordCount: z.number()
  }),
  outputSchema: z.object({
    result: z.string()
  }),
  execute: async ({ inputData }) => {
    const { original, uppercased, charCount, wordCount } = inputData;
    const borderLen = Math.max(uppercased.length + 4, 30);
    const border = "\u2550".repeat(borderLen);
    const pad = (str) => str.padEnd(borderLen + 1) + "\u2551";
    const result = [
      `\u2554${border}\u2557`,
      pad(`\u2551 \u{1F504} REVERSE TRANSFORMATION COMPLETE`),
      `\u2560${border}\u2563`,
      pad(`\u2551 Original: "${original}"`),
      pad(`\u2551 Result:   "${uppercased}"`),
      pad(`\u2551 Stats:    ${charCount} chars, ${wordCount} words`),
      `\u255A${border}\u255D`
    ].join("\n");
    return { result };
  }
});
const reverseWorkflow = createWorkflow({
  id: "reverse-workflow",
  description: "A 4-step workflow that analyzes, reverses, uppercases, and formats text",
  inputSchema: z.object({
    text: z.string()
  }),
  outputSchema: z.object({
    result: z.string()
  })
}).then(analyzeStep).then(reverseStep).then(uppercaseStep).then(formatStep).commit();

"use strict";
const reverseTextTool = createTool({
  id: "reverse-text",
  description: "Reverses a text string character by character",
  inputSchema: z.object({
    text: z.string().describe("The text to reverse")
  }),
  execute: async ({ text }) => {
    return text.split("").reverse().join("");
  }
});
const reverseAgent = new Agent({
  id: "reverse-agent",
  name: "reverse-agent",
  description: "Reverses text character by character, with an optional fancy transformation workflow",
  instructions: `You are a text reversal agent. You have two capabilities:

1. **Simple reverse**: Use the reverse-text tool to quickly reverse text.
2. **Fancy transform**: Use the reverse-workflow for a full transformation that analyzes, reverses, uppercases, and formats text with decorative borders.

When the user asks for a simple reverse, use the tool. When they want something fancy or formatted, use the workflow.

IMPORTANT: When calling tools or workflows, only pass the text from the user's CURRENT message. Do not include previous conversation history. Extract just the relevant text to transform.

Examples:
- User: "hello" \u2192 Use tool with text="hello" \u2192 "olleh"
- User: "reverse hello but make it fancy" \u2192 Use workflow with text="hello" \u2192 formatted output`,
  model: "anthropic/claude-3-5-sonnet-20241022",
  tools: { reverseTextTool },
  workflows: { reverseWorkflow },
  memory: new Memory({
    options: {
      lastMessages: 20
      // Maintains context for conversation flow
    }
  })
});

"use strict";
const allCapsTool = createTool({
  id: "all-caps",
  description: "Converts text to ALL CAPS",
  inputSchema: z.object({
    text: z.string().describe("The text to convert to all caps")
  }),
  execute: async ({ text }) => {
    return text.toUpperCase();
  }
});
const capsAgent = new Agent({
  id: "caps-agent",
  name: "caps-agent",
  description: "Converts text to ALL CAPS",
  instructions: `You are an enthusiastic caps agent! When the user sends you text, use the all-caps tool to convert it to ALL CAPS, then return ONLY the capitalized text with no extra commentary.

IMPORTANT: When calling tools or workflows, only pass the text from the user's CURRENT message. Do not include previous conversation history. Extract just the relevant text to transform.


Examples:
- User: "hello" \u2192 You: "HELLO"
- User: "Hello World!" \u2192 You: "HELLO WORLD!"
- User: "make this loud" \u2192 You: "MAKE THIS LOUD"`,
  model: "anthropic/claude-3-5-sonnet-20241022",
  tools: { allCapsTool },
  memory: new Memory({
    options: {
      lastMessages: 20
      // Keep last 20 messages in context
    }
  })
});

"use strict";
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

"use strict";
const SPINNER = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
const TOOL_ICONS = ["\u{1F504}", "\u2699\uFE0F", "\u{1F527}", "\u26A1"];
const WORKFLOW_ICONS = ["\u{1F4CB}", "\u26A1", "\u{1F504}", "\u2728"];
const ANIMATION_INTERVAL = 300;
const TOOL_DISPLAY_DELAY = 300;
const STEP_DISPLAY_DELAY = 300;

"use strict";
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

"use strict";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const formatName = (id) => id.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

"use strict";
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
        text: text ?? getStatusText(state, frame)
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

"use strict";
function createSlackEventsRoute(config) {
  return registerApiRoute(`/slack/${config.name}/events`, {
    method: "POST",
    handler: async (c) => {
      try {
        const body = await c.req.text();
        const payload = JSON.parse(body);
        if (payload.type === "url_verification") {
          console.log(`\u2705 [${config.name}] URL verification challenge received`);
          return c.json({ challenge: payload.challenge });
        }
        if (!config.botToken || !config.signingSecret) {
          console.error(`\u274C [${config.name}] Missing bot token or signing secret`);
          return c.json({ error: "Server misconfigured" }, 500);
        }
        const slackSignature = c.req.header("x-slack-signature");
        const slackTimestamp = c.req.header("x-slack-request-timestamp");
        if (!slackSignature || !slackTimestamp) {
          return c.json({ error: "Missing Slack signature headers" }, 401);
        }
        const isValid = verifySlackRequest(config.signingSecret, slackSignature, slackTimestamp, body);
        if (!isValid) {
          console.error(`\u274C [${config.name}] Invalid Slack signature`);
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
                console.error(`\u274C [${config.name}] Error processing message:`, error);
              }
            })();
          }
        }
        return c.json({ ok: true });
      } catch (error) {
        console.error(`Error handling Slack event [${config.name}]:`, error);
        return c.json({ error: "Failed to handle event" }, 500);
      }
    }
  });
}
const slackApps = [
  {
    name: "reverse",
    botToken: process.env.SLACK_REVERSE_BOT_TOKEN,
    signingSecret: process.env.SLACK_REVERSE_SIGNING_SECRET,
    agentName: "reverseAgent"
  },
  {
    name: "caps",
    botToken: process.env.SLACK_CAPS_BOT_TOKEN,
    signingSecret: process.env.SLACK_CAPS_SIGNING_SECRET,
    agentName: "capsAgent"
  }
];
const slackRoutes = slackApps.map(createSlackEventsRoute);

"use strict";
const mastra = new Mastra({
  // Registered agents - keys must match agentName in slack/routes.ts
  agents: {
    reverseAgent,
    capsAgent
  },
  // Registered workflows - available to agents via their workflows config
  workflows: {
    reverseWorkflow
  },
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
