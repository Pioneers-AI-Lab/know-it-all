/**
 * Caps Agent - Simple Text Uppercasing Agent
 *
 * A straightforward agent that demonstrates basic tool usage without workflows.
 * Converts any text input to ALL CAPS using a single tool.
 *
 * Purpose:
 * - Demonstrates minimal agent configuration (tools only, no workflows)
 * - Shows how to create focused, single-purpose agents
 * - Example of concise agent instructions for simple transformations
 *
 * Key Differences from reverseAgent:
 * - Only has tools (no workflows)
 * - Simpler instruction set
 * - Returns only transformed text without commentary
 *
 * Usage Pattern:
 * - Connected to Slack via /slack/caps/events endpoint
 * - Receives messages stripped of bot mentions
 * - Uses tool execution shown with animated spinners in Slack
 *
 * Important Notes:
 * - Agent is instructed to return ONLY transformed text
 * - No additional commentary or explanation in responses
 * - Same memory configuration as other agents for consistency
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * All caps conversion tool
 *
 * Takes a string and converts it to uppercase.
 * Example: "hello world" → "HELLO WORLD"
 */
const allCapsTool = createTool({
	id: 'all-caps',
	description: 'Converts text to ALL CAPS',
	inputSchema: z.object({
		text: z.string().describe('The text to convert to all caps'),
	}),
	execute: async ({ text }) => {
		return text.toUpperCase();
	},
});

export const capsAgent = new Agent({
	id: 'caps-agent',
	name: 'caps-agent',
	description: 'Converts text to ALL CAPS',
	instructions: `You are an enthusiastic caps agent! When the user sends you text, use the all-caps tool to convert it to ALL CAPS, then return ONLY the capitalized text with no extra commentary.

IMPORTANT: When calling tools or workflows, only pass the text from the user's CURRENT message. Do not include previous conversation history. Extract just the relevant text to transform.


Examples:
- User: "hello" → You: "HELLO"
- User: "Hello World!" → You: "HELLO WORLD!"
- User: "make this loud" → You: "MAKE THIS LOUD"`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { allCapsTool },
	memory: new Memory({
		options: {
			lastMessages: 20, // Keep last 20 messages in context
		},
	}),
});
