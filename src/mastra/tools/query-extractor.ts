/**
 * Query Extractor Tool - Intelligent Question Parsing and Classification
 *
 * This tool serves as the first step in the query processing pipeline, extracting user questions
 * from conversational messages and classifying them into structured query objects with proper types.
 *
 * Purpose:
 * - Parses natural language user messages to identify questions
 * - Classifies questions into predefined categories based on content and keywords
 * - Structures queries into a standardized JSON format for downstream agents
 * - Handles conversational context and extracts the core question intent
 *
 * Classification Strategy:
 * - Analyzes keywords related to data categories (startups, events, workshops, timeline, founders, guests)
 * - Detects question indicators (question marks, interrogative words)
 * - Maps detected keywords to one of 7 question types
 * - Falls back to 'general' type for unclassified questions
 *
 * Question Types:
 * 1. startups: Company/portfolio queries
 * 2. events: Event information requests
 * 3. workshops: Training/workshop queries
 * 4. timeline: Program schedule/phase questions
 * 5. founders: Founder-specific information
 * 6. guests: Special guest event queries
 * 7. general: Catch-all for other accelerator questions
 *
 * Pipeline Position:
 * User Message → [Query Extractor] → Orchestrator Sender → Orchestrator Agent → Specialized Agents
 *
 * Output Format:
 * {
 *   query: "extracted question text",
 *   questionType: "startups|events|workshops|timeline|founders|guests|general",
 *   timestamp: "ISO date string"
 * }
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
export const queryExtractor = createTool({
	id: 'query-extractor',
	description:
		"Extracts the user's question from their message and formats it into a structured JSON object",
	inputSchema: z.object({
		message: z
			.string()
			.describe("The user's message containing a question"),
	}),
	outputSchema: z.object({
		query: z.string().describe('The extracted question'),
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
			.describe('The type of question based on data categories'),
		formatted: z
			.object({
				question: z.string(),
				type: z.string(),
				timestamp: z.string(),
			})
			.describe('The formatted JSON object containing the question'),
	}),
	execute: async ({ message: userMessage }) => {
		message('🔍 QUERY EXTRACTOR - Starting extraction');
		log('Raw message:', userMessage);

		// Clean the message - remove extra whitespace and normalize
		const cleanedMessage = userMessage.trim().replace(/\s+/g, ' ');

		// Extract the core question
		// Remove common prefixes like "can you", "please", "tell me", etc.
		let query = cleanedMessage
			.replace(
				/^(can you|could you|would you|please|tell me|i want to know|i need to know|i'm asking|i ask)\s+/i,
				'',
			)
			.trim();

		// Ensure it ends with a question mark if it's a question
		if (!query.endsWith('?') && !query.endsWith('.')) {
			query += '?';
		}

		// Determine question type based on keywords related to data files
		// Keywords for each data type (case-insensitive matching)
		const dataTypeKeywords = {
			startups: [
				/startup/i,
				/company/i,
				/companies/i,
				/business/i,
				/venture/i,
				/portfolio/i,
				/funding/i,
				/investment/i,
				/raised/i,
				/traction/i,
				/mrr/i,
				/revenue/i,
			],
			events: [
				/event/i,
				/events/i,
				/calendar/i,
				/schedule/i,
				/scheduled/i,
				/meeting/i,
				/meetings/i,
				/session/i,
				/sessions/i,
				/fireside/i,
				/ama/i,
			],
			workshops: [
				/workshop/i,
				/workshops/i,
				/training/i,
				/seminar/i,
				/learning/i,
				/curriculum/i,
			],
			timeline: [
				/timeline/i,
				/phase/i,
				/phases/i,
				/program/i,
				/cohort/i,
				/schedule/i,
				/duration/i,
				/week/i,
				/weeks/i,
				/milestone/i,
				/milestones/i,
			],
			founders: [
				/founder/i,
				/founders/i,
				/entrepreneur/i,
				/entrepreneurs/i,
				/ceo/i,
				/cto/i,
				/co-founder/i,
				/team/i,
				/background/i,
				/experience/i,
			],
			guests: [
				/guest/i,
				/guests/i,
				/speaker/i,
				/speakers/i,
				/invited/i,
				/special guest/i,
				/visiting/i,
			],
		};

		// Check for keywords in the query (case-insensitive)
		const queryLower = query.toLowerCase();
		let questionType:
			| 'startups'
			| 'events'
			| 'workshops'
			| 'timeline'
			| 'founders'
			| 'guests'
			| 'general' = 'general';

		// Check each data type's keywords
		for (const [type, patterns] of Object.entries(dataTypeKeywords)) {
			for (const pattern of patterns) {
				if (pattern.test(queryLower)) {
					questionType = type as typeof questionType;
					break;
				}
			}
			if (questionType !== 'general') break;
		}

		// Format as JSON object
		const formatted = {
			question: query,
			type: questionType,
			timestamp: new Date().toISOString(),
		};

		message('🔍 QUERY EXTRACTOR - Result');
		log('Extracted query:', query);
		log('Detected questionType:', questionType);
		log('Formatted object:', JSON.stringify(formatted, null, 2));

		return {
			query,
			questionType,
			formatted,
		};
	},
});
