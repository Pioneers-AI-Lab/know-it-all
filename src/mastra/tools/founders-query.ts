/**
 * Founders Query Tool - Founder Profile Information Retrieval
 *
 * This tool searches the founders.json knowledge base to find information about founders
 * in the Pioneer.vc accelerator. Used by the startups-agent for founder-specific queries.
 *
 * Purpose:
 * - Loads and searches founders.json data file
 * - Performs semantic search across founder profiles
 * - Returns matching founders with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/founders.json
 * Content: Founder objects with names, backgrounds, startups, expertise, etc.
 *
 * Search Strategy:
 * - Uses searchInObject helper for deep object searching
 * - Searches all founder fields (name, bio, startup, experience, etc.)
 * - Returns founders that match search terms
 * - Provides found flag for empty result handling
 *
 * Pipeline Position:
 * Startups Agent → Query Receiver → [Founders Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   founders: Array of matching founder objects,
 *   found: boolean (true if founders.length > 0)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both founders array and found flag
 * - Data formatter expects this complete structure
 * - Works in tandem with startups-query for company-specific queries
 * - Both tools are available to startups-agent
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './data-helpers';
import { message, log } from '../../lib/print-helpers';
export const foundersQuery = createTool({
	id: 'founders-query',
	description:
		'Queries the founders database to find information about founders in the accelerator',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The search query to find relevant founders'),
	}),
	outputSchema: z.object({
		founders: z
			.array(z.any())
			.describe('Matching founders from the database'),
		found: z.boolean().describe('Whether matching founders were found'),
	}),
	execute: async ({ query }) => {
		message('🔎 FOUNDERS QUERY - Searching founders database');
		log('Query:', query);

		const data = loadJsonData('founders.json');
		const results: any[] = [];

		if (data.founders && Array.isArray(data.founders)) {
			for (const founder of data.founders) {
				if (searchInObject(founder, query)) {
					results.push(founder);
				}
			}
		}

		const finalResults = results.slice(0, 10); // Limit to top 10 results
		message(`✅ FOUNDERS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} founder(s) found`
				: 'No founders found',
		);

		return {
			founders: finalResults,
			found: results.length > 0,
		};
	},
});
