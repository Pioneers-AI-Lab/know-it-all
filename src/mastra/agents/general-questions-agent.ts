/**
 * General Questions Agent - Handles General Accelerator Inquiries
 *
 * This specialized agent processes general questions about the Pioneer.vc accelerator program
 * that don't fit into specific categories like events, startups, or workshops. It searches
 * a knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches general knowledge base using generalQuestionsQuery tool
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { generalQuestionsQuery } from '../tools/general-questions-query';

export const generalQuestionsAgent = new Agent({
	id: 'general-questions-agent',
	name: 'general-questions-agent',
	description:
		'General Questions Agent is responsible for answering general questions',
	instructions: `You are a general questions agent for the Pioneer.vc accelerator program. You handle general questions about the program that don't fit into specific categories like events, startups, or founders.

When you receive a query:
1. Use the general-questions-query tool with the user's question to search the knowledge base
2. The tool returns an object with "answers" (array of matching Q&A pairs), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If answers are found, provide detailed information from the data
- When users ask for specific data (lists, facts, fields), extract and display the exact information
- If no answers are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the general-questions-query tool.`,
	model: 'anthropic/claude-3-5-haiku-20241022',
	tools: {
		generalQuestionsQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 10,
		},
	}),
});
