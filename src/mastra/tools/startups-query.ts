/**
 * Startups Query Tool - Startup Company Information Retrieval
 *
 * This tool searches the startups.json knowledge base to find information about startups
 * in the Pioneer.vc accelerator. Used by the startups-agent for startup-specific queries.
 *
 * Purpose:
 * - Loads and searches startups.json data file
 * - Performs semantic search across startup profiles
 * - Returns matching startups with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/startups.json
 * Content: Startup objects with names, descriptions, industries, funding, team, etc.
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches all startup fields (name, description, industry, team, funding, etc.)
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
 * - Handles queries about startup companies, their products, funding, teams, etc.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
import { loadJsonData, searchInObject } from './data-helpers';

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
			.describe('Matching startups from the database'),
		found: z.boolean().describe('Whether matching startups were found'),
	}),
	execute: async ({ query }) => {
		message('🔎 STARTUPS QUERY - Searching startups database');
		log('Query:', query);

		const startupsData = loadJsonData('startups.json');
		const queryLower = query.toLowerCase();

		// Check if query is asking for "all startups" or "list of startups"
		const isAllStartupsQuery =
			queryLower.includes('all startup') ||
			queryLower.includes('list of startup') ||
			queryLower.includes('every startup') ||
			queryLower.includes('all the startup') ||
			queryLower === 'startups' ||
			queryLower === 'startup';

		const results: any[] = [];

		if (startupsData.startups && Array.isArray(startupsData.startups)) {
			if (isAllStartupsQuery) {
				// Return all startups if query asks for all
				message('📋 STARTUPS QUERY - Returning all startups');
				results.push(...startupsData.startups);
			} else {
				// Search across all startup fields using searchInObject
				for (const startup of startupsData.startups) {
					if (searchInObject(startup, query)) {
						results.push(startup);
					}
				}
			}
		}

		const finalResults = results.slice(0, 50); // Limit to top 50 results for "all" queries
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
