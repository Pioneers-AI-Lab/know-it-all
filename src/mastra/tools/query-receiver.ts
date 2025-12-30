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
			.enum(['pioneers', 'sessions', 'general'])
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
		return { logged: true };
	},
});
