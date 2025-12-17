import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool to log received queries to the console.
 * This tool extracts and logs query information when the orchestrator receives a query.
 */
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
		console.log('='.repeat(60));
		console.log('📥 ORCHESTRATOR AGENT - Received Query');
		console.log('='.repeat(60));
		console.log('Query:', query);
		console.log(
			'Formatted Query Object:',
			JSON.stringify(formatted, null, 2),
		);
		console.log('Timestamp:', formatted.timestamp);
		console.log('Question Type:', formatted.type);
		console.log('='.repeat(60));

		return { logged: true };
	},
});
