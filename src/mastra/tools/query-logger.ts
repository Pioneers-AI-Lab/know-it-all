/**
 * Query Logger Tool - Orchestrator Query Reception Logging
 *
 * This tool provides visibility into the orchestrator-agent's query processing by logging
 * all received queries with their metadata. Essential for debugging and monitoring the
 * multi-agent pipeline.
 *
 * Purpose:
 * - Logs queries when orchestrator-agent receives them from Lucie agent
 * - Provides console visibility into the routing pipeline
 * - Displays query content, type, and timing information
 * - Helps debug query classification and routing issues
 *
 * Log Output Format:
 * - Formatted with visual separators for readability
 * - Shows query text, question type, and timestamp
 * - Uses emoji indicators (📥) for visual identification
 * - Displays complete formatted query object
 *
 * Pipeline Position:
 * Lucie → Orchestrator → [Query Logger] → Query Router → Specialized Agents
 *
 * Usage:
 * - First tool called by orchestrator-agent
 * - Always called before query-router tool
 * - Non-blocking - doesn't affect query processing
 * - Logs to console for development/debugging visibility
 *
 * Important Notes:
 * - This is a logging tool only - no side effects on query processing
 * - Helps track query flow through the system
 * - Useful for debugging question type classification
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
export const queryLogger = createTool({
	id: 'query-logger',
	description:
		'Logs the received query and formatted query object to the console for debugging and monitoring',
	inputSchema: z.object({
		query: z.string().describe('The extracted query string'),
		formatted: z
			.object({
				question: z.string(),
				type: z.string(),
				timestamp: z.string(),
			})
			.describe('The formatted JSON object containing the question'),
	}),
	outputSchema: z.object({
		logged: z
			.boolean()
			.describe('Whether the query was successfully logged'),
	}),
	execute: async ({ query, formatted }) => {
		// message('📥 ORCHESTRATOR AGENT - Received Query');
		// log('Query:', query);
		// log('Formatted Query Object:', JSON.stringify(formatted, null, 2));
		// log('Timestamp:', formatted.timestamp);
		// log('Question Type:', formatted.type);

		return { logged: true };
	},
});
