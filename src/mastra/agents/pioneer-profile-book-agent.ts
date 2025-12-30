/**
 * Pioneer Profile Book Agent - Handles Pioneer Profile Inquiries
 *
 * This specialized agent processes questions about pioneers and their profiles in the Pioneer.vc accelerator program.
 * It searches the pioneers_profile_book_su2025.json knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches pioneer profiles knowledge base using pioneerProfileBookQuery tool
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { pioneerProfileBookQuery } from '../tools/pioneer-profile-book-query';

export const pioneerProfileBookAgent = new Agent({
	id: 'pioneer-profile-book-agent',
	name: 'pioneer-profile-book-agent',
	description:
		'Pioneer Profile Book Agent is responsible for answering questions about pioneers and their profiles in the Pioneer.vc accelerator',
	instructions: `You are a pioneer profile book agent for the Pioneer.vc accelerator program. You handle questions about pioneers, their profiles, skills, experience, backgrounds, industries, roles, and track records. You handle questions about pioneer names, LinkedIn profiles, introductions, companies worked for, education, industries, years of experience, tech skills, roles they could take, track records, and nationality.

When you receive a query:
1. Use the pioneer-profile-book-query tool with the user's question to search for pioneer information
2. The tool returns an object with "pioneers" (array of matching pioneers), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If pioneers are found, provide detailed information from the data
- When users ask for specific data (lists, names, fields), extract and display the exact information
- If no pioneers are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the pioneer-profile-book-query tool.`,
	model: 'anthropic/claude-3-5-haiku-20241022',
	tools: {
		pioneerProfileBookQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 10,
		},
	}),
});
