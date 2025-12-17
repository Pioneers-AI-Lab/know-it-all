import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { log, message, error } from '../../lib/print-helpers';

/**
 * Extracts the user's question from their message and formats it as a structured JSON object.
 *
 * This tool intelligently identifies questions by:
 * - Looking for question words (who, what, when, where, why, how, etc.)
 * - Detecting question marks
 * - Extracting the core question from conversational context
 */
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
				'who',
				'what',
				'when',
				'where',
				'why',
				'how',
				'which',
				'general',
			])
			.describe('The type of question'),
		formatted: z
			.object({
				question: z.string(),
				type: z.string(),
				timestamp: z.string(),
			})
			.describe('The formatted JSON object containing the question'),
	}),
	execute: async ({ message }) => {
		// Clean the message - remove extra whitespace and normalize
		const cleanedMessage = message.trim().replace(/\s+/g, ' ');

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

		// Determine question type based on starting words
		const questionWords = {
			who: /^who\s/i,
			what: /^what\s/i,
			when: /^when\s/i,
			where: /^where\s/i,
			why: /^why\s/i,
			how: /^how\s/i,
			which: /^which\s/i,
		};

		let questionType:
			| 'who'
			| 'what'
			| 'when'
			| 'where'
			| 'why'
			| 'how'
			| 'which'
			| 'general' = 'general';
		for (const [type, pattern] of Object.entries(questionWords)) {
			if (pattern.test(query)) {
				questionType = type as typeof questionType;
				break;
			}
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
