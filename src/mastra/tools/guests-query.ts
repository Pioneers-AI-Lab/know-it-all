import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';

/**
 * Tool for querying special events with guests information
 */
export const guestsQuery = createTool({
	id: 'guests-query',
	description:
		'Queries the special events with guests database to find information about guest speakers and their events',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant guest events'),
	}),
	outputSchema: z.object({
		events: z
			.array(z.any())
			.describe('Matching guest events from the database'),
		found: z.boolean().describe('Whether matching guest events were found'),
	}),
	execute: async ({ query }) => {
		const data = loadJsonData('special-events-with-guests.json');
		const results: any[] = [];

		if (data.events && Array.isArray(data.events)) {
			for (const event of data.events) {
				if (searchInObject(event, query)) {
					results.push(event);
				}
			}
		}

		return {
			events: results.slice(0, 10), // Limit to top 10 results
			found: results.length > 0,
		};
	},
});
