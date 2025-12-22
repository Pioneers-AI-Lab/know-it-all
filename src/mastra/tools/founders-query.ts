/**
 * Founders Query Tool - Founder Profile Information Retrieval & Matching
 *
 * This tool searches the founders.json knowledge base to find information about founders
 * in the Pioneer.vc accelerator. Used by the founders-agent for founder-specific queries
 * including listing founders, matching co-founders, and filtering by various criteria.
 *
 * Purpose:
 * - Loads and searches founders.json data file
 * - Performs intelligent search across founder profiles
 * - Handles aggregate queries (count, totals, etc.)
 * - Handles specific role queries (CTO, CEO, etc.)
 * - Handles matching queries (finding co-founders)
 * - Returns matching founders with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/founders.json
 * Content: Founder objects with names, backgrounds, startups, expertise, skills, etc.
 *
 * Search Strategy:
 * - Detects query type: aggregate, role-based, matching, or general search
 * - For aggregate queries: returns all founders with summary metadata
 * - For role queries: filters by role (CTO, CEO, COO, etc.)
 * - For matching queries: finds founders seeking co-founders
 * - For general queries: uses searchInObject for deep object searching
 * - Searches all founder fields (name, role, skills, background, etc.)
 *
 * Pipeline Position:
 * Founders Agent → Query Receiver → [Founders Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   founders: Array of matching founder objects,
 *   found: boolean (true if founders.length > 0),
 *   metadata: { queryType, totalCount, ... } (optional metadata)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both founders array and found flag
 * - Data formatter expects this complete structure
 * - Handles queries about founders, roles, matching, skills, etc.
 * - For matching queries, prioritizes founders with seeking_cofounder: true
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
import { loadJsonData, searchInObject, searchInText } from './data-helpers';

export const foundersQuery = createTool({
	id: 'founders-query',
	description:
		'Queries the founders database to find information about founders in the accelerator. Handles general searches, role-based queries (CTO, CEO, etc.), matching queries (co-founder matching), and aggregate queries (count, totals, etc.)',
	inputSchema: z.object({
		query: z
			.string()
			.describe(
				'The search query to find relevant founders or answer questions about them',
			),
	}),
	outputSchema: z.object({
		founders: z
			.array(z.any())
			.describe('Matching founders from the database'),
		found: z.boolean().describe('Whether matching founders were found'),
		metadata: z
			.object({
				queryType: z
					.enum(['aggregate', 'role', 'matching', 'general', 'all'])
					.optional()
					.describe('Type of query detected'),
				totalCount: z
					.number()
					.optional()
					.describe('Total number of founders'),
				role: z
					.string()
					.optional()
					.describe('Role filter applied (CTO, CEO, etc.)'),
			})
			.optional()
			.describe('Additional metadata about the query results'),
	}),
	execute: async ({ query }) => {
		message('🔎 FOUNDERS QUERY - Searching founders database');
		log('Query:', query);

		const data = loadJsonData('founders.json');
		const allFounders = data.founders || [];
		const queryLower = query.toLowerCase();

		// Detect query type
		const isAggregateQuery =
			queryLower.includes('how many') ||
			queryLower.includes('count') ||
			queryLower.includes('total') ||
			queryLower.includes('number of') ||
			queryLower.includes('founders are');

		const isAllFoundersQuery =
			queryLower.includes('all founder') ||
			queryLower.includes('list of founder') ||
			queryLower.includes('every founder') ||
			queryLower.includes('all the founder') ||
			queryLower === 'founders' ||
			queryLower === 'founder';

		const isMatchingQuery =
			queryLower.includes('match') ||
			queryLower.includes('find me a') ||
			queryLower.includes('looking for') ||
			queryLower.includes('seeking') ||
			queryLower.includes('available') ||
			queryLower.includes('co-founder') ||
			queryLower.includes('cofounder');

		const isRoleQuery =
			queryLower.includes('cto') ||
			queryLower.includes('ceo') ||
			queryLower.includes('coo') ||
			queryLower.includes('chief') ||
			queryLower.includes('technical founder') ||
			queryLower.includes('business founder') ||
			queryLower.includes('founder with role');

		// Extract specific role if mentioned
		let targetRole: string | null = null;
		if (isRoleQuery) {
			if (
				queryLower.includes('cto') ||
				queryLower.includes('technical')
			) {
				targetRole = 'CTO';
			} else if (
				queryLower.includes('ceo') ||
				queryLower.includes('business')
			) {
				targetRole = 'CEO';
			} else if (queryLower.includes('coo')) {
				targetRole = 'COO';
			}
		}

		let results: any[] = [];
		let metadata:
			| {
					queryType:
						| 'aggregate'
						| 'role'
						| 'matching'
						| 'general'
						| 'all';
					totalCount?: number;
					role?: string;
			  }
			| undefined;

		if (allFounders.length === 0) {
			message('⚠️ FOUNDERS QUERY - No founders found in database');
			return {
				founders: [],
				found: false,
			};
		}

		// Handle aggregate queries - return all founders with metadata
		if (isAggregateQuery) {
			message(
				'📊 FOUNDERS QUERY - Detected aggregate query, returning all founders',
			);
			results = [...allFounders];
			metadata = {
				queryType: 'aggregate' as const,
				totalCount: allFounders.length,
			};
		}
		// Handle "all founders" queries
		else if (isAllFoundersQuery) {
			message('📋 FOUNDERS QUERY - Returning all founders');
			results = [...allFounders];
			metadata = {
				queryType: 'all' as const,
				totalCount: allFounders.length,
			};
		}
		// Handle matching queries - find founders seeking co-founders
		else if (isMatchingQuery) {
			message('🎯 FOUNDERS QUERY - Detected matching query');

			// Filter for founders seeking co-founders
			const seekingFounders = allFounders.filter(
				(founder: any) =>
					founder.seeking_cofounder === true ||
					founder.startup_stage === 'Looking for co-founder',
			);

			// If role is specified, filter by role
			if (targetRole) {
				const roleFiltered = seekingFounders.filter(
					(founder: any) =>
						founder.role?.toUpperCase() ===
						targetRole?.toUpperCase(),
				);
				if (roleFiltered.length > 0) {
					results = roleFiltered;
					metadata = {
						queryType: 'matching' as const,
						role: targetRole,
					};
				} else {
					// If no matches with role, return all seeking founders
					results = seekingFounders;
					metadata = {
						queryType: 'matching' as const,
					};
				}
			} else {
				// Check if query mentions a specific role to match
				if (
					queryLower.includes('technical') ||
					queryLower.includes('cto')
				) {
					results = seekingFounders.filter(
						(founder: any) =>
							founder.role === 'CTO' ||
							founder.cofounder_type_seeking === 'Technical/CTO',
					);
					metadata = {
						queryType: 'matching' as const,
						role: 'CTO',
					};
				} else if (
					queryLower.includes('business') ||
					queryLower.includes('ceo')
				) {
					results = seekingFounders.filter(
						(founder: any) =>
							founder.role === 'CEO' ||
							founder.cofounder_type_seeking === 'Business/CEO',
					);
					metadata = {
						queryType: 'matching' as const,
						role: 'CEO',
					};
				} else {
					results = seekingFounders;
					metadata = {
						queryType: 'matching' as const,
					};
				}
			}
		}
		// Handle role-based queries
		else if (isRoleQuery && targetRole) {
			message(
				`🎯 FOUNDERS QUERY - Detected role query for ${targetRole}`,
			);
			results = allFounders.filter(
				(founder: any) =>
					founder.role?.toUpperCase() === targetRole.toUpperCase(),
			);
			metadata = {
				queryType: 'role' as const,
				role: targetRole,
				totalCount: results.length,
			};
		}
		// General search - use semantic matching
		else {
			message('🔍 FOUNDERS QUERY - Performing general search');
			// Search across all founder fields using searchInObject
			for (const founder of allFounders) {
				if (searchInObject(founder, query)) {
					results.push(founder);
				}
			}
			metadata = {
				queryType: 'general' as const,
			};
		}

		const finalResults = results.slice(0, 50); // Limit to top 50 results
		message(`✅ FOUNDERS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} founder(s) found`
				: 'No founders found',
		);
		if (metadata) {
			log('Query type:', metadata.queryType);
			if (metadata.totalCount !== undefined) {
				log('Total count:', metadata.totalCount);
			}
			if (metadata.role) {
				log('Role filter:', metadata.role);
			}
		}

		return {
			founders: finalResults,
			found: results.length > 0,
			metadata,
		};
	},
});
