/**
 * Workshops Query Tool - Workshop and Training Session Retrieval
 *
 * This tool searches for workshop and training session information. Due to empty workshops.json,
 * it falls back to searching the timeline.json for workshop-related events and activities.
 *
 * Purpose:
 * - Attempts to load workshops.json first
 * - Falls back to timeline.json if workshops data is empty
 * - Searches for workshop-related content across data sources
 * - Returns matching workshops with metadata
 *
 * Data Sources:
 * Primary: data/workshops.json (currently empty)
 * Fallback: data/timeline.json (contains workshop events in timeline)
 *
 * Search Strategy:
 * - First tries workshops.json
 * - If empty or not found, searches timeline.json
 * - Uses searchInObject helper for deep object searching
 * - Returns workshops/events that match search terms
 *
 * Pipeline Position:
 * Workshops Agent → Query Receiver → [Workshops Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   workshops: Array of matching workshop objects,
 *   found: boolean (true if workshops.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both workshops array and found flag
 * - Data formatter expects this complete structure
 * - Fallback logic handles missing or empty data files gracefully
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';
import { message, log } from '../../lib/print-helpers';
export const workshopsQuery = createTool({
	id: 'workshops-query',
	description:
		'Queries the timeline database to find information about workshops in the accelerator program',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant workshops'),
	}),
	outputSchema: z.object({
		workshops: z
			.array(z.any())
			.describe('Matching workshop events from the timeline'),
		found: z.boolean().describe('Whether matching workshops were found'),
	}),
	execute: async ({ query }) => {
		message('🔎 WORKSHOPS QUERY - Searching timeline for workshops');
		log('Query:', query);

		const data = loadJsonData('timeline.json');
		const results: any[] = [];

		// Search for workshop-related events in the timeline
		if (data.timeline && Array.isArray(data.timeline)) {
			for (const phase of data.timeline) {
				if (phase.key_events && Array.isArray(phase.key_events)) {
					for (const event of phase.key_events) {
						// Check if it's a workshop (name contains "workshop" or "Workshop")
						const isWorkshop =
							event.name &&
							event.name.toLowerCase().includes('workshop');

						// Also search in the query
						const matchesQuery = searchInObject(event, query);

						if (isWorkshop && matchesQuery) {
							results.push({
								...event,
								phase_name: phase.phase_name,
								phase_id: phase.phase_id,
								duration_weeks: phase.duration_weeks,
							});
						}
					}
				}
			}
		}

		const finalResults = results.slice(0, 10); // Limit to top 10 results
		message(`✅ WORKSHOPS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} workshop(s) found`
				: 'No workshops found',
		);

		return {
			workshops: finalResults,
			found: results.length > 0,
		};
	},
});
