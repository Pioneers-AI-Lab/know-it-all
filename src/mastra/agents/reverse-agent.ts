/**
 * Reverse Agent - Text Reversal with Tool and Workflow Support
 *
 * This agent demonstrates two different approaches to text processing:
 * 1. Simple tool execution for quick transformations
 * 2. Complex workflow execution for multi-step processing
 *
 * The agent intelligently chooses between:
 * - reverse-text tool: Fast, single-step reversal
 * - reverse-workflow: Full transformation with analysis, reversal, uppercasing, and formatting
 *
 * Key Concepts:
 * - Tools: Synchronous functions that return immediate results
 * - Workflows: Multi-step processes that can be more complex and show progress
 * - Memory: Maintains conversation context (last 20 messages) for thread continuity
 *
 * Usage Pattern:
 * - Connected to Slack via /slack/reverse/events endpoint
 * - Receives messages stripped of bot mentions
 * - Responses stream back to Slack with animated status updates
 *
 * Important Notes:
 * - Agent instructions explicitly prevent passing conversation history to tools/workflows
 * - This prevents tools from receiving unintended context or previous messages
 * - Memory is used for conversation understanding, not tool input
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { reverseWorkflow } from '../workflows/reverse-workflow';

/**
 * Simple text reversal tool
 *
 * Takes a string and reverses it character by character.
 * Example: "hello" → "olleh"
 */
const reverseTextTool = createTool({
  id: 'reverse-text',
  description: 'Reverses a text string character by character',
  inputSchema: z.object({
    text: z.string().describe('The text to reverse'),
  }),
  execute: async ({ text }) => {
    return text.split('').reverse().join('');
  },
});

export const reverseAgent = new Agent({
  id: 'reverse-agent',
  name: 'reverse-agent',
  description: 'Reverses text character by character, with an optional fancy transformation workflow',
  instructions: `You are a text reversal agent. You have two capabilities:

1. **Simple reverse**: Use the reverse-text tool to quickly reverse text.
2. **Fancy transform**: Use the reverse-workflow for a full transformation that analyzes, reverses, uppercases, and formats text with decorative borders.

When the user asks for a simple reverse, use the tool. When they want something fancy or formatted, use the workflow.

IMPORTANT: When calling tools or workflows, only pass the text from the user's CURRENT message. Do not include previous conversation history. Extract just the relevant text to transform.

Examples:
- User: "hello" → Use tool with text="hello" → "olleh"
- User: "reverse hello but make it fancy" → Use workflow with text="hello" → formatted output`,
  model: 'anthropic/claude-3-5-sonnet-20241022',
  tools: { reverseTextTool },
  workflows: { reverseWorkflow },
  memory: new Memory({
    options: {
      lastMessages: 20, // Maintains context for conversation flow
    },
  }),
});
