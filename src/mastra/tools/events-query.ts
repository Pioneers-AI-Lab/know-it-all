/**
 * Events Query Tool - Event Information Retrieval
 *
 * This tool searches the calendar-events.json knowledge base to find information about accelerator
 * events, meetings, and scheduled activities. Used by the calendar-agent to answer event-related queries.
 *
 * Purpose:
 * - Loads and searches calendar-events.json data file
 * - Performs intelligent search across event objects
 * - Handles aggregate queries (count, totals, etc.)
 * - Handles specific field queries (date, location, guest, etc.)
 * - Returns matching events with metadata
 * - Indicates whether results were found
 *
 * Data Source:
 * File: data/calendar-events.json
 * Content: Event objects with dates, descriptions, locations, guests, registration info, etc.
 *
 * Search Strategy:
 * - Detects query type: aggregate, specific field, or general search
 * - For aggregate queries: returns all events with summary metadata
 * - For specific field queries: extracts relevant events and enriches with field info
 * - For general queries: uses searchInObject for deep object searching
 * - Searches all event fields (title, date, description, location, guest, etc.)
 *
 * Pipeline Position:
 * Calendar Agent → Query Receiver → [Events Query] → Data Formatter → Response Sender
 *
 * Output Format:
 * {
 *   events: Array of matching event objects (or all events for aggregate queries),
 *   found: boolean (true if events.length > 0),
 *   metadata: { queryType, totalCount, ... } (optional metadata for aggregate queries)
 * }
 *
 * Important Notes:
 * - Returns COMPLETE object with both events array and found flag
 * - Data formatter expects this complete structure
 * - Handles queries about events, dates, locations, guests, registration, etc.
 * - For aggregate queries, returns all events so downstream agents can compute totals
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject, searchInText } from './data-helpers';
import { message, log } from '../../lib/print-helpers';

export const eventsQuery = createTool({
	id: 'events-query',
	description:
		'Queries the calendar events database to find information about events in the accelerator. Handles general searches, specific field queries (date, location, guest, etc.), and aggregate queries (count, totals, etc.)',
	inputSchema: z.object({
		query: z
			.string()
			.describe(
				'The search query to find relevant events or answer questions about them',
			),
	}),
	outputSchema: z.object({
		events: z.array(z.any()).describe('Matching events from the database'),
		found: z.boolean().describe('Whether matching events were found'),
		metadata: z
			.object({
				queryType: z
					.enum(['aggregate', 'specific_field', 'general', 'all'])
					.optional()
					.describe('Type of query detected'),
				totalCount: z
					.number()
					.optional()
					.describe('Total number of events'),
			})
			.optional()
			.describe('Additional metadata about the query results'),
	}),
	execute: async ({ query }) => {
		message('🔎 EVENTS QUERY - Searching calendar events database');
		log('Query:', query);

		const data = loadJsonData('calendar-events.json');
		const allEvents = data.events || [];
		const queryLower = query.toLowerCase();

		// Detect query type
		const isAggregateQuery =
			queryLower.includes('how many') ||
			queryLower.includes('count') ||
			queryLower.includes('total') ||
			queryLower.includes('number of') ||
			queryLower.includes('events are') ||
			queryLower.includes('events scheduled');

		const isAllEventsQuery =
			queryLower.includes('all event') ||
			queryLower.includes('list of event') ||
			queryLower.includes('every event') ||
			queryLower.includes('all the event') ||
			queryLower === 'events' ||
			queryLower === 'event' ||
			queryLower.includes('what events') ||
			queryLower.includes('show me events') ||
			queryLower.includes('calendar');

		const isSpecificFieldQuery =
			queryLower.includes('when') ||
			queryLower.includes('date') ||
			queryLower.includes('time') ||
			queryLower.includes('where') ||
			queryLower.includes('location') ||
			queryLower.includes('venue') ||
			queryLower.includes('room') ||
			queryLower.includes('who is') ||
			queryLower.includes('guest') ||
			queryLower.includes('speaker') ||
			queryLower.includes('title') ||
			queryLower.includes('name of') ||
			queryLower.includes('description') ||
			queryLower.includes('registration') ||
			queryLower.includes('rsvp') ||
			queryLower.includes('capacity') ||
			queryLower.includes('audience') ||
			queryLower.includes('mandatory') ||
			queryLower.includes('reminder') ||
			queryLower.includes('tag') ||
			queryLower.includes('cohort') ||
			queryLower.includes('start date') ||
			queryLower.includes('end date');

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

		if (allEvents.length === 0) {
			message('⚠️ EVENTS QUERY - No events found in database');
			return {
				events: [],
				found: false,
			};
		}

		// Handle aggregate queries - return all events with metadata
		if (isAggregateQuery) {
			message(
				'📊 EVENTS QUERY - Detected aggregate query, returning all events',
			);
			results = [...allEvents];
			metadata = {
				queryType: 'aggregate' as const,
				totalCount: allEvents.length,
			};
		}
		// Handle "all events" queries
		else if (isAllEventsQuery) {
			message('📋 EVENTS QUERY - Returning all events');
			results = [...allEvents];
			metadata = {
				queryType: 'all' as const,
				totalCount: allEvents.length,
			};
		}
		// Handle specific field queries - extract event name/title and return relevant events
		else if (isSpecificFieldQuery) {
			message('🎯 EVENTS QUERY - Detected specific field query');

			// Try to extract event title or event_id from query
			let matchedEvents: any[] = [];
			for (const event of allEvents) {
				const eventTitleLower = event.title?.toLowerCase() || '';
				const eventIdLower = event.event_id?.toLowerCase() || '';
				// Check if query mentions this event by title or ID
				if (
					queryLower.includes(eventTitleLower) ||
					queryLower.includes(eventIdLower) ||
					searchInText(queryLower, eventTitleLower) ||
					searchInText(queryLower, eventIdLower)
				) {
					matchedEvents.push(event);
				}
			}

			// If specific event found, return just that one
			if (matchedEvents.length > 0) {
				results = matchedEvents;
				metadata = {
					queryType: 'specific_field' as const,
				};
			} else {
				// If no specific event mentioned, return all for field extraction
				results = [...allEvents];
				metadata = {
					queryType: 'specific_field' as const,
					totalCount: allEvents.length,
				};
			}
		}
		// General search - use semantic matching
		else {
			message('🔍 EVENTS QUERY - Performing general search');
			// Search across all event fields using searchInObject
			for (const event of allEvents) {
				if (searchInObject(event, query)) {
					results.push(event);
				}
			}
			metadata = {
				queryType: 'general' as const,
			};
		}

		const finalResults = results.slice(0, 50); // Limit to top 50 results
		message(`✅ EVENTS QUERY - Found ${finalResults.length} result(s)`);
		log(
			'Results:',
			finalResults.length > 0
				? `${finalResults.length} event(s) found`
				: 'No events found',
		);
		if (metadata) {
			log('Query type:', metadata.queryType);
			if (metadata.totalCount !== undefined) {
				log('Total count:', metadata.totalCount);
			}
		}

		return {
			events: finalResults,
			found: results.length > 0,
			metadata,
		};
	},
});
