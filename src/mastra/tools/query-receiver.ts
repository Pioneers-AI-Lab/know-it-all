import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for specialized agents to log received queries.
 * This tool should be added to each specialized agent to log when they receive a query.
 */
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
