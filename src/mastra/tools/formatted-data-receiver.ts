/**
 * Formatted Data Receiver Tool - Response Generator Data Intake Logging
 *
 * This tool logs the formatted data received by the response-generator-agent from
 * specialized agents. Provides visibility into what data is being used to generate
 * final user responses.
 *
 * Purpose:
 * - Logs formatted data when response-generator-agent receives it
 * - Displays data source, query context, and content summary
 * - Helps debug response generation issues
 * - Confirms successful data transfer between agents
 *
 * Log Output:
 * - Source agent name
 * - Question type and original query
 * - Data summary
 * - Complete relevant data (JSON formatted)
 * - Timestamp information
 * - Visual indicators (📬) for data reception
 *
 * Pipeline Position:
 * Specialized Agent → Response Sender → [Formatted Data Receiver] → Response Synthesis
 *
 * Input Format:
 * Formatted data object containing:
 * - query: Original user question
 * - questionType: Classification type
 * - agentName: Source specialized agent
 * - summary: Data summary
 * - relevantData: Retrieved data
 * - timestamp: Formatting timestamp
 *
 * Important Notes:
 * - First tool called by response-generator-agent
 * - Non-blocking logging operation
 * - Helps track data flow to response generation
 * - Useful for debugging incomplete or incorrect responses
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
export const formattedDataReceiver = createTool({
	id: 'formatted-data-receiver',
	description:
		'Receives and logs formatted data from specialized agents before generating the final response',
	inputSchema: z.object({
		formatted: z
			.object({
				query: z.string(),
				questionType: z.string(),
				agentName: z.string(),
				summary: z.string(),
				relevantData: z.any(),
				timestamp: z.string(),
			})
			.describe('The formatted data received from a specialized agent'),
	}),
	outputSchema: z.object({
		logged: z
			.boolean()
			.describe('Whether the formatted data was successfully logged'),
	}),
	execute: async ({ formatted }) => {
		message('📬 RESPONSE GENERATOR AGENT - Received Formatted Data');
		log('Original Query:', formatted.query);
		log('Question Type:', formatted.questionType);
		log('Data Source:', formatted.agentName);
		log('Summary:', formatted.summary);
		log('Received at:', formatted.timestamp);
		log('Relevant Data:', JSON.stringify(formatted.relevantData, null, 2));

		return { logged: true };
	},
});
