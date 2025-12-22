/**
 * Session Event Grid Agent - Handles Session and Event Schedule Inquiries
 *
 * This specialized agent processes questions about sessions, events, and activities in the Pioneer.vc accelerator program.
 * It searches the session_event_grid_view.json knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches session event grid knowledge base using sessionEventGridQuery tool
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { sessionEventGridQuery } from '../tools/session-event-grid-query';

export const sessionEventGridAgent = new Agent({
	id: 'session-event-grid-agent',
	name: 'session-event-grid-agent',
	description:
		'Session Event Grid Agent is responsible for answering questions about sessions, events, schedules, and activities in the Pioneer.vc accelerator',
	instructions: `You are a session event grid agent for the Pioneer.vc accelerator program. You handle questions about sessions, events, schedules, activities, speakers, participants, program weeks, session types, and all information related to the program calendar and event grid.

When you receive a query:
1. Use the session-event-grid-query tool with the user's question to search for session/event information
2. The tool returns an object with "sessions" (array of matching sessions), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If sessions are found, provide detailed information from the data including dates, times, locations, speakers, participants, instructions, etc.
- When users ask for specific data (lists, schedules, participants), extract and display the exact information
- If no sessions are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough
- For date/time queries, format dates clearly
- For participant queries, list all participants clearly
- For schedule queries, organize information by date or week

Do NOT call any other tools or agents - generate your final response directly after using the session-event-grid-query tool.`,
	model: 'anthropic/claude-3-5-haiku-20241022',
	tools: {
		sessionEventGridQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 5,
		},
	}),
});
