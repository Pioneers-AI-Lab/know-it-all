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
 * - Analyzes keywords related to data categories (startups, founders, pioneers, sessions, general)
 * - Detects question indicators (question marks, interrogative words)
 * - Maps detected keywords to one of 5 question types
 * - Falls back to 'general' type for unclassified questions
 *
 * Question Types:
 * 1. startups: Company/portfolio queries
 * 2. founders: Founder-specific information
 * 3. pioneers: Pioneer profile book queries
 * 4. sessions: Session information requests
 * 5. general: Catch-all for other accelerator questions
 *
 * Pipeline Position:
 * User Message → Lucie Agent → Query Extractor → Specialized Agent Router → Specialized Agent
 *
 * Output Format:
 * {
 *   query: "extracted question text",
 *   questionType: "startups|founders|pioneers|sessions|general",
 *   timestamp: "ISO date string"
 * }
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
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
			.enum(['startups', 'founders', 'pioneers', 'sessions', 'general'])
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
			founders: [
				/founder/i,
				/founders/i,
				/entrepreneur/i,
				/entrepreneurs/i,
				/ceo/i,
				/cto/i,
				/cofounder/i,
				/co-founder/i,
				/co-founders/i,
				/team/i,
				/background/i,
				/experience/i,
				/skills/i,
				/background/i,
				/experience/i,
				/skills/i,
				/background/i,
				/experience/i,
				/skills/i,
			],
			pioneers: [
				/pioneer/i,
				/pioneers/i,
				/profile book/i,
				/pioneer profile/i,
				/pioneer profiles/i,
				/pioneer book/i,
			],
			sessions: [
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
				/session/i,
				/sessions/i,
				/event grid/i,
				/session grid/i,
				/schedule/i,
				/program week/i,
				/week \d+/i,
				/masterclass/i,
				/group exercise/i,
				/office hours/i,
				/pitch day/i,
				/friday pitch/i,
			],
		};

		// Check for keywords in the query (case-insensitive)
		const queryLower = query.toLowerCase();
		let questionType:
			| 'startups'
			| 'founders'
			| 'pioneers'
			| 'sessions'
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

		return {
			query,
			questionType,
			formatted,
		};
	},
});
