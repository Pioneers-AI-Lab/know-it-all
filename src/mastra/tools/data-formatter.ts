import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for formatting retrieved data into a structured format for the response generator
 */
export const dataFormatter = createTool({
	id: 'data-formatter',
	description:
		'Formats retrieved data from JSON files into a structured format suitable for generating user responses',
	inputSchema: z.object({
		query: z.string().describe('The original user query'),
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
		data: z.any().describe('The raw data retrieved from the JSON file'),
		agentName: z
			.string()
			.describe('The name of the agent that retrieved the data'),
	}),
	outputSchema: z.object({
		formatted: z
			.object({
				query: z.string(),
				questionType: z.string(),
				agentName: z.string(),
				summary: z.string(),
				relevantData: z.any(),
				timestamp: z.string(),
			})
			.describe('The formatted data ready for the response generator'),
	}),
	execute: async ({ query, questionType, data, agentName }) => {
		// Create a summary of the retrieved data
		let summary = '';
		let relevantData: any = [];

		// Handle query tool results - they return objects with specific keys
		if (data && typeof data === 'object') {
			// Handle query tool results (they return { answers/startups/events/founders/workshops/phases: [...], found: boolean })
			if (data.answers && Array.isArray(data.answers)) {
				// From general-questions-query
				summary = `Found ${data.answers.length} matching answer(s) in the knowledge base.`;
				relevantData = data.answers;
			} else if (data.startups && Array.isArray(data.startups)) {
				// From startups-query
				summary = `Found ${data.startups.length} matching startup(s).`;
				relevantData = data.startups;
			} else if (data.founders && Array.isArray(data.founders)) {
				// From founders-query
				summary = `Found ${data.founders.length} matching founder(s).`;
				relevantData = data.founders;
			} else if (data.workshops && Array.isArray(data.workshops)) {
				// From workshops-query
				summary = `Found ${data.workshops.length} matching workshop(s).`;
				relevantData = data.workshops;
			} else if (data.phases && Array.isArray(data.phases)) {
				// From timeline-query - combine phases and events
				const phaseCount = data.phases.length;
				const eventCount = data.events?.length || 0;
				summary = `Found ${phaseCount} matching phase(s) and ${eventCount} matching event(s).`;
				relevantData = {
					phases: data.phases,
					events: data.events || [],
				};
			} else if (data.events && Array.isArray(data.events)) {
				// From events-query or guests-query
				summary = `Found ${data.events.length} matching event(s).`;
				relevantData = data.events;
			} else if (data.timeline && Array.isArray(data.timeline)) {
				// From timeline-query (alternative structure)
				summary = `Found ${data.timeline.length} timeline phase(s).`;
				relevantData = data.timeline;
			} else if (Array.isArray(data)) {
				// Direct array passed
				if (data.length > 0) {
					summary = `Found ${data.length} matching result(s) for the query.`;
					relevantData = data;
				} else {
					summary = 'No matching results found for the query.';
					relevantData = [];
				}
			} else {
				// Fallback: use the entire object
				summary = 'Retrieved data from the knowledge base.';
				relevantData = data;
			}
		} else if (Array.isArray(data)) {
			// Direct array passed
			if (data.length > 0) {
				summary = `Found ${data.length} matching result(s) for the query.`;
				relevantData = data;
			} else {
				summary = 'No matching results found for the query.';
				relevantData = [];
			}
		} else {
			// Fallback
			summary = 'Data retrieved successfully.';
			relevantData = data || [];
		}

		const formatted = {
			query,
			questionType,
			agentName,
			summary,
			relevantData,
			timestamp: new Date().toISOString(),
		};

		return { formatted };
	},
});
