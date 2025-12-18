/**
 * Events Query Tool - Event Information Retrieval
 *
 * This tool searches the events.json knowledge base to find information about accelerator
 * events, meetings, and scheduled activities. Used by the event-agent to answer event-related queries.
 *
 * Purpose:
 * - Loads and searches events.json data file
 * - Performs semantic search across event objects
 * - Returns matching events with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/events.json
 * Content: Event objects with dates, descriptions, locations, attendees, etc.
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches all event fields (title, date, description, location, etc.)
 * - Returns events that match search terms
 * - Provides found flag for empty result handling
 *
 * Pipeline Position:
 * Event Agent → Query Receiver → [Events Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   events: Array of matching event objects,
 *   found: boolean (true if events.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both events array and found flag
 * - Data formatter expects this complete structure
 * - Empty results still return success with found=false
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';

export const eventsQuery = createTool({
	id: 'events-query',
	description:
		'Queries the calendar events database to find information about events in the accelerator',
	inputSchema: z.object({
		query: z.string().describe('The search query to find relevant events'),
	}),
	outputSchema: z.object({
		events: z.array(z.any()).describe('Matching events from the database'),
		found: z.boolean().describe('Whether matching events were found'),
	}),
	execute: async ({ query }) => {
		const data = loadJsonData('calendar-events.json');
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
