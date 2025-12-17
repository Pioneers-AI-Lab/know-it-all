import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';

/**
 * Tool for querying timeline information
 */
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
