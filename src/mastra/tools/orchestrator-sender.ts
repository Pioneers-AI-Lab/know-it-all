import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Sends an extracted query to the orchestrator-agent for processing.
 *
 * This tool takes a formatted query object and forwards it to the orchestrator-agent,
 * which is responsible for routing the query to the appropriate specialized agents.
 */
export const orchestratorSender = createTool({
	id: 'orchestrator-sender',
	description:
		'Sends an extracted query to the orchestrator-agent for routing and processing',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The extracted query to send to the orchestrator'),
		formatted: z
			.object({
				question: z.string(),
				type: z.string(),
				timestamp: z.string(),
			})
			.describe('The formatted JSON object containing the question'),
	}),
	outputSchema: z.object({
		success: z
			.boolean()
			.describe('Whether the query was successfully sent'),
		response: z
			.string()
			.describe('The response from the orchestrator-agent'),
	}),
	execute: async ({
		query,
		formatted,
	}): Promise<{
		success: boolean;
		response: string;
	}> => {
		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the orchestrator-agent from the mastra instance
		const orchestratorAgent = mastra.getAgent('orchestratorAgent');
		if (!orchestratorAgent) {
			throw new Error('Orchestrator agent not found');
		}

		// Create a message that includes both the query and the formatted object
		const message = `Process this query: ${query}\n\nFormatted query object: ${JSON.stringify(
			formatted,
			null,
			2,
		)}`;

		// Send the query to the orchestrator-agent
		const response = await orchestratorAgent.generate(message);

		return {
			success: true,
			response: response.text || JSON.stringify(response),
		};
	},
});
