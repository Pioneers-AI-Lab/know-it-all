import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const queryExtractor = createTool({
	id: 'query-extractor',
	description: "Extracts the query from the user's message",
	inputSchema: z.object({
		message: z.string().describe("The user's message"),
	}),
	outputSchema: z.object({
		query: z.string().describe("The query from the user's message"),
	}),
	execute: async ({ message }) => {
		return { query: message.split(' ').slice(1).join(' ') };
	},
});
