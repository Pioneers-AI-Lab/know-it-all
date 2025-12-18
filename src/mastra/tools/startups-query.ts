/**
 * Startups Query Tool - Portfolio Company Information Retrieval
 *
 * This tool searches the startups.json knowledge base to find information about companies
 * in the Pioneer.vc accelerator portfolio. Used by the startups-agent for company queries.
 *
 * Purpose:
 * - Loads and searches startups.json data file
 * - Performs semantic search across startup objects
 * - Returns matching companies with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/startups.json
 * Content: Startup objects with company names, descriptions, funding, team, etc.
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches all startup fields (name, description, industry, funding, etc.)
 * - Returns startups that match search terms
 * - Provides found flag for empty result handling
 *
 * Pipeline Position:
 * Startups Agent → Query Receiver → [Startups Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   startups: Array of matching startup objects,
 *   found: boolean (true if startups.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both startups array and found flag
 * - Data formatter expects this complete structure
 * - Works in tandem with founders-query for founder-specific queries
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';
import { message, log } from '../../lib/print-helpers';
export const startupsQuery = createTool({
	id: 'startups-query',
	description:
		'Queries the startups database to find information about startups in the accelerator',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant startups'),
	}),
	outputSchema: z.object({
		startups: z
			.array(z.any())
			.describe('Matching startup information from the database'),
		found: z.boolean().describe('Whether matching startups were found'),
	}),
	execute: async ({ query }) => {
		message('🔎 STARTUPS QUERY - Searching startups database');
		log('Query:', query);

		const data = loadJsonData('startups.json');
		const results: any[] = [];

		if (data.startups && Array.isArray(data.startups)) {
			for (const startup of data.startups) {
				if (searchInObject(startup, query)) {
					results.push(startup);
				}
			}
		}

		const finalResults = results.slice(0, 10); // Limit to top 10 results
		message(`✅ STARTUPS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} startup(s) found`
				: 'No startups found',
		);

		return {
			startups: finalResults,
			found: results.length > 0,
		};
	},
});
