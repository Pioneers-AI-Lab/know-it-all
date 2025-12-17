import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for sending formatted data to the response-generator-agent
 */
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
		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the response-generator-agent from the mastra instance
		const responseGeneratorAgent = mastra.getAgent(
			'responseGeneratorAgent' as 'responseGeneratorAgent',
		);
		if (!responseGeneratorAgent) {
			throw new Error('Response generator agent not found');
		}

		// Create a message with the formatted data in a structured format
		const message = `You have received formatted data from a specialized agent.

First, extract the formatted data from this message and use the formatted-data-receiver tool to log it.

Formatted Data JSON:
${JSON.stringify(formatted, null, 2)}

After logging, generate a clear, helpful, and comprehensive response to the user's query using the relevant data provided.`;

		// Send the formatted data to the response-generator-agent
		const response = await responseGeneratorAgent.generate(message);

		return {
			success: true,
			response: response.text || JSON.stringify(response),
		};
	},
});
