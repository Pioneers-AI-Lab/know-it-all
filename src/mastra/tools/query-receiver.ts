/**
 * Query Receiver Tool - Specialized Agent Query Reception Logging
 *
 * This tool provides logging capabilities for specialized agents when they receive queries
 * from the orchestrator. Each specialized agent uses this tool as the first step in their
 * processing pipeline for visibility and debugging.
 *
 * Purpose:
 * - Logs query reception at specialized agent level
 * - Displays which agent received the query
 * - Shows query content and classification type
 * - Provides visibility into the distributed query flow
 *
 * Log Output:
 * - Agent name and emoji indicator (🎯)
 * - Query text and question type
 * - Visual separators for readability
 * - Confirms successful query reception
 *
 * Pipeline Position (for each specialized agent):
 * Orchestrator → [Query Receiver] → Data Query Tool → Data Formatter → Response Sender
 *
 * Used By:
 * - general-questions-agent
 * - event-agent
 * - event-guests-agent
 * - startups-agent
 * - timeline-agent
 * - workshops-agent
 *
 * Important Notes:
 * - Always first tool called by specialized agents
 * - Non-blocking logging operation
 * - Helps track query distribution across agents
 * - Useful for debugging routing issues
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
export const queryReceiver = createTool({
	id: 'query-receiver',
	description:
		'Logs the received query when a specialized agent receives a query from the orchestrator',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The query string received from the orchestrator'),
		questionType: z
			.enum([
				'startups',
				'events',
				'workshops',
				'timeline',
				'founders',
				'guests',
				'general',
			])
			.describe('The type of question'),
		agentName: z
			.string()
			.describe('The name of the specialized agent receiving the query'),
	}),
	outputSchema: z.object({
		logged: z
			.boolean()
			.describe('Whether the query was successfully logged'),
	}),
	execute: async ({ query, questionType, agentName }) => {
		console.log('='.repeat(60));
		console.log(`📨 ${agentName.toUpperCase()} - Received Query`);
		console.log('='.repeat(60));
		console.log('Query:', query);
		console.log('Question Type:', questionType);
		console.log('Received at:', new Date().toISOString());
		console.log('='.repeat(60));

		return { logged: true };
	},
});
