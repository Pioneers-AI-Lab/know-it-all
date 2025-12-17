import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';

/**
 * Tool for querying founders information
 */
export const foundersQuery = createTool({
	id: 'founders-query',
	description:
		'Queries the founders database to find information about founders in the accelerator',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant founders'),
	}),
	outputSchema: z.object({
		founders: z
			.array(z.any())
			.describe('Matching founders from the database'),
		found: z.boolean().describe('Whether matching founders were found'),
	}),
	execute: async ({ query }) => {
		const data = loadJsonData('founders.json');
		const results: any[] = [];

		if (data.founders && Array.isArray(data.founders)) {
			for (const founder of data.founders) {
				if (searchInObject(founder, query)) {
					results.push(founder);
				}
			}
		}

		return {
			founders: results.slice(0, 10), // Limit to top 10 results
			found: results.length > 0,
		};
	},
});
