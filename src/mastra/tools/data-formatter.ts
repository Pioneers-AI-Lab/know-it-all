/**
 * Data Formatter Tool - Structured Data Packaging for Response Generation
 *
 * This tool transforms raw data retrieved from JSON knowledge bases into a structured format
 * suitable for the response-generator-agent. It adds context, metadata, and summaries to help
 * generate comprehensive user responses.
 *
 * Purpose:
 * - Receives raw data from specialized agent query tools
 * - Adds contextual metadata (query, questionType, agentName, timestamp)
 * - Creates summary of the retrieved data
 * - Packages everything into a standardized format
 * - Prepares data for response-sender tool
 *
 * Data Flow:
 * Query Tool (returns raw data) → [Data Formatter] → Response Sender → Response Generator Agent
 *
 * Input Requirements:
 * - query: Original user question
 * - questionType: Classification of the question
 * - data: ENTIRE result object from query tool (not just the array)
 * - agentName: Name of specialized agent processing the query
 *
 * Output Structure:
 * {
 *   query: string,
 *   questionType: string,
 *   agentName: string,
 *   summary: string (describes what was found),
 *   relevantData: any (the actual retrieved data),
 *   timestamp: ISO date string
 * }
 *
 * Important Notes:
 * - Must receive COMPLETE result object from query tools
 * - Do NOT pass just the data array - pass {data, found} object
 * - Summary generation helps response-generator understand the data
 * - Used by all specialized agents in their processing pipeline
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
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
		message('📦 DATA FORMATTER - Formatting retrieved data');
		log('Query:', query);
		log('Question Type:', questionType);
		log('Agent Name:', agentName);
		log('Raw data received:', JSON.stringify(data, null, 2));

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
				if (data.metadata?.queryType === 'aggregate') {
					summary = `Found ${
						data.metadata.totalCount || data.startups.length
					} total startup(s) in the accelerator.`;
				} else if (data.metadata?.queryType === 'specific_field') {
					summary = `Found ${data.startups.length} startup(s) matching the query.`;
				} else {
					summary = `Found ${data.startups.length} matching startup(s).`;
				}
				relevantData = data.startups;
				// Include metadata if present for context
				if (data.metadata) {
					relevantData = {
						startups: data.startups,
						metadata: data.metadata,
					};
				}
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
				if (data.metadata?.queryType === 'aggregate') {
					summary = `Found ${
						data.metadata.totalCount || data.events.length
					} total event(s) in the calendar.`;
				} else if (data.metadata?.queryType === 'specific_field') {
					summary = `Found ${data.events.length} event(s) matching the query.`;
				} else {
					summary = `Found ${data.events.length} matching event(s).`;
				}
				relevantData = data.events;
				// Include metadata if present for context
				if (data.metadata) {
					relevantData = {
						events: data.events,
						metadata: data.metadata,
					};
				}
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

		// message('✅ DATA FORMATTER - Data formatted successfully');
		// log('Summary:', summary);
		// log(
		// 	'Relevant data count:',
		// 	Array.isArray(relevantData) ? relevantData.length : 'N/A',
		// );

		return { formatted };
	},
});
