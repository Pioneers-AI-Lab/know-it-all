/**
 * Startups Agent - Handles Startup Company Inquiries
 *
 * This specialized agent processes questions about startups in the Pioneer.vc accelerator program.
 * It searches the startups knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches startups knowledge base using startupsQuery tool
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { startupsQuery } from '../tools/startups-query';

export const startupsAgent = new Agent({
	id: 'startups-agent',
	name: 'startups-agent',
	description:
		'Startups Agent is responsible for answering questions about startups in the Pioneer.vc accelerator',
	instructions: `You are a startups agent for the Pioneer.vc accelerator program. You handle questions about startup companies, their products, funding, teams, industries, and business models.

When you receive a query:
1. Use the startups-query tool with the user's question to search for startup information
2. The tool returns an object with "startups" (array of matching startups), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If startups are found, provide detailed information from the data
- When users ask for specific data (lists, names, fields), extract and display the exact information
- If no startups are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the startups-query tool.`,
	model: 'anthropic/claude-3-5-haiku-20241022',
	tools: {
		startupsQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 5,
		},
	}),
});
