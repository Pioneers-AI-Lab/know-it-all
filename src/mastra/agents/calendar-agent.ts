/**
 * Calendar Agent - Handles Event and Calendar Inquiries
 *
 * This specialized agent processes questions about events and calendar information in the Pioneer.vc accelerator program.
 * It searches the calendar-events.json knowledge base and generates user-facing responses directly.
 *
 * Responsibilities:
 * - Receives queries from Lucie agent
 * - Searches calendar events knowledge base using eventsQuery tool
 * - Generates clear, comprehensive responses directly for users
 *
 * Optimizations (Phase 2):
 * - Removed queryReceiver, dataFormatter, responseSender tools (30-40% faster)
 * - Generates responses directly instead of routing through response-generator-agent
 * - Single tool call per query instead of 4 sequential tools
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { eventsQuery } from '../tools/events-query';

export const calendarAgent = new Agent({
	id: 'calendar-agent',
	name: 'calendar-agent',
	description:
		'Calendar Agent is responsible for answering questions about events and calendar information in the Pioneer.vc accelerator',
	instructions: `You are a calendar agent for the Pioneer.vc accelerator program. You handle questions about events, calendar information, and scheduled activities. You handle questions about event dates, times, locations, guests, descriptions, registration requirements, and event types.

When you receive a query:
1. Use the events-query tool with the user's question to search for event information
2. The tool returns an object with "events" (array of matching events), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If events are found, provide detailed information from the data
- When users ask for specific data (lists, dates, fields), extract and display the exact information
- If no events are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the events-query tool.`,
	model: 'anthropic/claude-haiku-4-20250514',
	tools: {
		eventsQuery,
	},
	memory: new Memory({
		options: {
			lastMessages: 5,
		},
	}),
});
