/**
 * Response Sender Tool - Formatted Data Delivery to Response Generator
 *
 * This tool completes the specialized agent's processing by forwarding formatted data
 * to the response-generator-agent, which synthesizes the final user-facing response.
 *
 * Purpose:
 * - Acts as the bridge between specialized agents and response-generator-agent
 * - Sends formatted data objects via agent-to-agent communication
 * - Invokes response-generator-agent with proper data structure
 * - Returns the generated natural language response
 *
 * Pipeline Position (for each specialized agent):
 * Query Receiver → Data Query Tool → Data Formatter → [Response Sender] → Response Generator
 *
 * Input Format:
 * Receives formatted data object containing:
 * - query: Original user question
 * - questionType: Type classification
 * - agentName: Source agent name
 * - summary: Brief data summary
 * - relevantData: Actual retrieved data
 * - timestamp: When data was formatted
 *
 * Communication Pattern:
 * - Formats data as JSON string in message body
 * - Uses Mastra's agent-to-agent communication
 * - Response-generator-agent parses JSON and generates response
 * - Returns final user-facing message
 *
 * Important Notes:
 * - Last tool called by specialized agents
 * - Response-generator-agent must be registered in Mastra
 * - Formatted data must include ALL required fields
 * - Response contains natural language answer for user
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log, error } from '../../lib/print-helpers';
export const responseSender = createTool({
	id: 'response-sender',
	description:
		'Sends formatted data to the response-generator-agent for final response generation',
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
			.describe('The formatted data to send to the response generator'),
	}),
	outputSchema: z.object({
		success: z.boolean().describe('Whether the data was successfully sent'),
		response: z
			.string()
			.describe(
				'The generated response from the response-generator-agent',
			),
	}),
	execute: async ({
		formatted,
	}): Promise<{
		success: boolean;
		response: string;
	}> => {
		// message(
		// 	'📤 RESPONSE SENDER - Sending formatted data to response-generator-agent',
		// );
		// log('Formatted data:', JSON.stringify(formatted, null, 2));

		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the response-generator-agent from the mastra instance
		const responseGeneratorAgent = mastra.getAgent(
			'responseGeneratorAgent' as 'responseGeneratorAgent',
		);
		if (!responseGeneratorAgent) {
			// error('Response generator agent not found', null);
			throw new Error('Response generator agent not found');
		}

		// Create a message with the formatted data in a structured format
		const agentMessage = `You have received formatted data from a specialized agent.

First, extract the formatted data from this message and use the formatted-data-receiver tool to log it.

Formatted Data JSON:
${JSON.stringify(formatted, null, 2)}

After logging, generate a clear, helpful, and comprehensive response to the user's query using the relevant data provided.`;

		// Send the formatted data to the response-generator-agent
		const response = await responseGeneratorAgent.generate(agentMessage);

		return {
			success: true,
			response: response.text || JSON.stringify(response),
		};
	},
});
