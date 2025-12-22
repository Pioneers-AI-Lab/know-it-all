/**
 * Startups Query Tool - Startup Company Information Retrieval
 *
 * This tool searches the startups.json knowledge base to find information about startups
 * in the Pioneer.vc accelerator. Used by the startups-agent for startup-specific queries.
 *
 * Purpose:
 * - Loads and searches startups.json data file
 * - Performs intelligent search across startup profiles
 * - Handles aggregate queries (count, totals, etc.)
 * - Handles specific field queries (CEO name, funding stage, etc.)
 * - Returns matching startups with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/startups.json
 * Content: Startup objects with names, descriptions, industries, funding, team, etc.
 *
 * Search Strategy:
 * - Detects query type: aggregate, specific field, or general search
 * - For aggregate queries: returns all startups with summary metadata
 * - For specific field queries: extracts relevant startups and enriches with field info
 * - For general queries: uses searchInObject for deep object searching
 * - Searches all startup fields (name, description, industry, team, funding, etc.)
 *
 * Pipeline Position:
 * Startups Agent → Query Receiver → [Startups Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   startups: Array of matching startup objects (or all startups for aggregate queries),
 *   found: boolean (true if startups.length > 0),
 *   metadata: { queryType, totalCount, ... } (optional metadata for aggregate queries)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both startups array and found flag
 * - Data formatter expects this complete structure
 * - Handles queries about startup companies, their products, funding, teams, etc.
 * - For aggregate queries, returns all startups so downstream agents can compute totals
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
import { loadJsonData, searchInObject, searchInText } from './data-helpers';

export const startupsQuery = createTool({
	id: 'startups-query',
	description:
		'Queries the startups database to find information about startups in the accelerator. Handles general searches, specific field queries (CEO name, funding stage, etc.), and aggregate queries (count, totals, etc.)',
	inputSchema: z.object({
		query: z
			.string()
			.describe(
				'The search query to find relevant startups or answer questions about them',
			),
	}),
	outputSchema: z.object({
		startups: z
			.array(z.any())
			.describe('Matching startups from the database'),
		found: z.boolean().describe('Whether matching startups were found'),
		metadata: z
			.object({
				queryType: z
					.enum(['aggregate', 'specific_field', 'general', 'all'])
					.optional()
					.describe('Type of query detected'),
				totalCount: z
					.number()
					.optional()
					.describe('Total number of startups'),
			})
			.optional()
			.describe('Additional metadata about the query results'),
	}),
	execute: async ({ query }) => {
		// message('🔎 STARTUPS QUERY - Searching startups database');
		// log('Query:', query);

		const startupsData = loadJsonData('startups.json');
		const allStartups = startupsData.startups || [];
		const queryLower = query.toLowerCase();

		// Detect query type
		const isAggregateQuery =
			queryLower.includes('how many') ||
			queryLower.includes('count') ||
			queryLower.includes('total') ||
			queryLower.includes('number of') ||
			queryLower.includes('enrolled') ||
			queryLower.includes('companies are') ||
			queryLower.includes('startups are');

		const isAllStartupsQuery =
			queryLower.includes('all startup') ||
			queryLower.includes('list of startup') ||
			queryLower.includes('every startup') ||
			queryLower.includes('all the startup') ||
			queryLower === 'startups' ||
			queryLower === 'startup';

		const isSpecificFieldQuery =
			queryLower.includes('ceo') ||
			queryLower.includes('cto') ||
			queryLower.includes('coo') ||
			queryLower.includes('name of') ||
			queryLower.includes('funding stage') ||
			queryLower.includes('funding') ||
			queryLower.includes('raised') ||
			queryLower.includes('investors') ||
			queryLower.includes('industry') ||
			queryLower.includes('location') ||
			queryLower.includes('hq') ||
			queryLower.includes('headquarters') ||
			queryLower.includes('team') ||
			queryLower.includes('traction') ||
			queryLower.includes('mrr') ||
			queryLower.includes('users') ||
			queryLower.includes('customers') ||
			queryLower.includes('product stage') ||
			queryLower.includes('business model');

		let results: any[] = [];
		let metadata:
			| {
					queryType:
						| 'aggregate'
						| 'specific_field'
						| 'general'
						| 'all';
					totalCount?: number;
			  }
			| undefined;

		if (allStartups.length === 0) {
			// message('⚠️ STARTUPS QUERY - No startups found in database');
			return {
				startups: [],
				found: false,
			};
		}

		// Handle aggregate queries - return all startups with metadata
		if (isAggregateQuery) {
			// message(
			// 	'📊 STARTUPS QUERY - Detected aggregate query, returning all startups',
			// );
			results = [...allStartups];
			metadata = {
				queryType: 'aggregate' as const,
				totalCount: allStartups.length,
			};
		}
		// Handle "all startups" queries
		else if (isAllStartupsQuery) {
			// message('📋 STARTUPS QUERY - Returning all startups');
			results = [...allStartups];
			metadata = {
				queryType: 'all' as const,
				totalCount: allStartups.length,
			};
		}
		// Handle specific field queries - extract startup name and return relevant startups
		else if (isSpecificFieldQuery) {
			// message('🎯 STARTUPS QUERY - Detected specific field query');

			// Try to extract startup name from query
			let matchedStartups: any[] = [];
			for (const startup of allStartups) {
				const startupNameLower = startup.name?.toLowerCase() || '';
				// Check if query mentions this startup by name
				if (
					queryLower.includes(startupNameLower) ||
					searchInText(queryLower, startupNameLower)
				) {
					matchedStartups.push(startup);
				}
			}

			// If specific startup found, return just that one
			if (matchedStartups.length > 0) {
				results = matchedStartups;
				metadata = {
					queryType: 'specific_field' as const,
				};
			} else {
				// If no specific startup mentioned, return all for field extraction
				results = [...allStartups];
				metadata = {
					queryType: 'specific_field' as const,
					totalCount: allStartups.length,
				};
			}
		}
		// General search - use semantic matching
		else {
			// message('🔍 STARTUPS QUERY - Performing general search');
			// Search across all startup fields using searchInObject
			for (const startup of allStartups) {
				if (searchInObject(startup, query)) {
					results.push(startup);
				}
			}
			metadata = {
				queryType: 'general' as const,
			};
		}

		const finalResults = results.slice(0, 50); // Limit to top 50 results
		// message(`✅ STARTUPS QUERY - Found ${finalResults.length} result(s)`);
		// log(
		// 	'Results:',
		// 	finalResults.length > 0
		// 		? `${finalResults.length} startup(s) found`
		// 		: 'No startups found',
		// );
		if (metadata) {
			log('Query type:', metadata.queryType);
			if (metadata.totalCount !== undefined) {
				log('Total count:', metadata.totalCount);
			}
		}

		return {
			startups: finalResults,
			found: results.length > 0,
			metadata,
		};
	},
});
