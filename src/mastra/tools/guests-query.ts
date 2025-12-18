/**
 * Guests Query Tool - Special Guest Event Information Retrieval
 *
 * This tool searches the guest-events.json knowledge base to find information about special
 * guest speakers, visiting experts, and notable events. Used by event-guests-agent.
 *
 * Purpose:
 * - Loads and searches guest-events.json data file
 * - Performs semantic search across guest event objects
 * - Returns matching guest events with speaker information
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/guest-events.json
 * Content: Guest event objects with speaker names, topics, dates, bios, etc.
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches all guest event fields (speaker, topic, date, bio, etc.)
 * - Returns guest events that match search terms
 * - Provides found flag for empty result handling
 *
 * Pipeline Position:
 * Event Guests Agent → Query Receiver → [Guests Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   events: Array of matching guest event objects,
 *   found: boolean (true if events.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both events array and found flag
 * - Data formatter expects this complete structure
 * - Focuses on special events with notable guests/speakers
 * - Different from events-query which handles regular calendar events
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';
import { message, log } from '../../lib/print-helpers';
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
		message(
			'🔎 GUESTS QUERY - Searching special events with guests database',
		);
		log('Query:', query);

		const data = loadJsonData('special-events-with-guests.json');
		const results: any[] = [];

		if (data.events && Array.isArray(data.events)) {
			for (const event of data.events) {
				if (searchInObject(event, query)) {
					results.push(event);
				}
			}
		}

		const finalResults = results.slice(0, 10); // Limit to top 10 results
		message(`✅ GUESTS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} guest event(s) found`
				: 'No guest events found',
		);

		return {
			events: finalResults,
			found: results.length > 0,
		};
	},
});
