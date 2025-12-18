/**
 * Timeline Query Tool - Program Schedule and Phase Information Retrieval
 *
 * This tool searches the timeline.json knowledge base to find information about the accelerator's
 * program structure, phases, milestones, and schedule. Used by timeline-agent.
 *
 * Purpose:
 * - Loads and searches timeline.json data file
 * - Performs semantic search across phases and events
 * - Returns matching timeline information (phases and/or events)
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/timeline.json
 * Content: Program phases, milestones, events with dates and descriptions
 * Structure: Likely contains both "phases" and "events" arrays
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches across both phases and events
 * - Returns timeline data that matches search terms
 * - Provides found flag for empty result handling
 *
 * Pipeline Position:
 * Timeline Agent → Query Receiver → [Timeline Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   phases: Array of matching phase objects,
 *   events: Array of matching event objects,
 *   found: boolean (true if phases.length > 0 || events.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with phases, events, and found flag
 * - Data formatter expects this complete structure
 * - May return both phases and events in a single response
 * - Different from events-query which focuses on calendar events
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';
export const timelineQuery = createTool({
	id: 'timeline-query',
	description:
		'Queries the timeline database to find information about program phases, events, and milestones',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant timeline information'),
	}),
	outputSchema: z.object({
		phases: z.array(z.any()).describe('Matching phases from the timeline'),
		events: z.array(z.any()).describe('Matching events from the timeline'),
		found: z
			.boolean()
			.describe('Whether matching timeline information was found'),
	}),
	execute: async ({ query }) => {
		const data = loadJsonData('timeline.json');
		const phaseResults: any[] = [];
		const eventResults: any[] = [];

		if (data.timeline && Array.isArray(data.timeline)) {
			for (const phase of data.timeline) {
				if (searchInObject(phase, query)) {
					phaseResults.push(phase);
				}

				// Also search in key_events within each phase
				if (phase.key_events && Array.isArray(phase.key_events)) {
					for (const event of phase.key_events) {
						if (searchInObject(event, query)) {
							eventResults.push({
								...event,
								phase_name: phase.phase_name,
								phase_id: phase.phase_id,
							});
						}
					}
				}
			}
		}

		return {
			phases: phaseResults.slice(0, 5),
			events: eventResults.slice(0, 10),
			found: phaseResults.length > 0 || eventResults.length > 0,
		};
	},
});
