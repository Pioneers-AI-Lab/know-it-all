/**
 * Founders Agent - Handles Founder Profile Inquiries & Matching
 *
 * This specialized agent processes questions about founders in the Pioneer.vc accelerator program.
 * It searches the founders knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches founders knowledge base using foundersQuery tool
 * - Handles queries about founder profiles, roles, skills, and co-founder matching
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { foundersQuery } from '../tools/founders-query';

export const foundersAgent = new Agent({
	id: 'founders-agent',
	name: 'founders-agent',
	description:
		'Founders Agent is responsible for answering questions about founders in the Pioneer.vc accelerator, including listing founders, matching co-founders, and filtering by roles and skills',
	instructions: `You are a founders agent for the Pioneer.vc accelerator program. You handle questions about founder profiles, their roles (CTO, CEO, COO), skills, backgrounds, and co-founder matching.

When you receive a query:
1. Use the founders-query tool with the user's question to search for founder information
2. The tool returns an object with "founders" (array of matching founders), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If founders are found, provide detailed information from the data
- For co-founder matching queries, highlight relevant skills and roles
- When users ask for specific data (lists, names, fields), extract and display the exact information
- If no founders are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the founders-query tool.`,
	model: 'anthropic/claude-haiku-4-20250514',
	tools: {
		foundersQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 5,
		},
	}),
});
