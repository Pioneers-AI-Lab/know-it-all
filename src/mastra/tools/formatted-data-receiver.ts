import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for the response-generator-agent to receive and log formatted data
 */
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
		console.log('='.repeat(60));
		console.log('📬 RESPONSE GENERATOR AGENT - Received Formatted Data');
		console.log('='.repeat(60));
		console.log('Original Query:', formatted.query);
		console.log('Question Type:', formatted.questionType);
		console.log('Data Source:', formatted.agentName);
		console.log('Summary:', formatted.summary);
		console.log('Received at:', formatted.timestamp);
		console.log(
			'Relevant Data:',
			JSON.stringify(formatted.relevantData, null, 2),
		);
		console.log('='.repeat(60));

		return { logged: true };
	},
});
