/**
 * Orchestrator Sender Tool - Query Forwarding to Orchestrator Agent
 *
 * This tool completes the first phase of the query pipeline by sending extracted and classified
 * queries from the Lucie agent to the orchestrator-agent for routing to specialized agents.
 *
 * Purpose:
 * - Acts as the bridge between Lucie agent and orchestrator-agent
 * - Formats query data for inter-agent communication
 * - Invokes orchestrator-agent with proper context
 * - Returns orchestrator's response back to Lucie agent
 *
 * Communication Pattern:
 * This tool uses Mastra's agent-to-agent communication to pass queries between agents
 * without requiring direct HTTP calls or message queue systems.
 *
 * Pipeline Position:
 * Lucie Agent → Query Extractor → [Orchestrator Sender] → Orchestrator Agent → Specialized Agents
 *
 * Input:
 * - query: The extracted question text
 * - formatted: Complete query object with question, type, and timestamp
 *
 * Output:
 * - success: Whether the orchestrator received and processed the query
 * - response: The orchestrator's routing response or error message
 *
 * Important Notes:
 * - This tool is specific to the Lucie agent
 * - Orchestrator-agent must be registered in Mastra instance
 * - Response contains the full pipeline result from specialized agents
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log } from '../../lib/print-helpers';
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
		message('🚀 ORCHESTRATOR SENDER - Forwarding to orchestrator-agent');
		log('Query:', query);
		log('Formatted object:', JSON.stringify(formatted, null, 2));

		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the orchestrator-agent from the mastra instance
		const orchestratorAgent = mastra.getAgent('orchestratorAgent');
		if (!orchestratorAgent) {
			throw new Error('Orchestrator agent not found');
		}

		// Create a message that includes both the query and the formatted object
		const agentMessage = `Process this query: ${query}\n\nFormatted query object: ${JSON.stringify(
			formatted,
			null,
			2,
		)}`;

		// Send the query to the orchestrator-agent
		message('🚀 ORCHESTRATOR SENDER - Calling orchestrator-agent');
		log('Message sent:', agentMessage);

		const response = await orchestratorAgent.generate(agentMessage);

		const responseText = response.text || JSON.stringify(response);

		message(
			'✅ ORCHESTRATOR SENDER - Received response from orchestrator-agent',
		);
		log('Response text:', responseText);

		return {
			success: true,
			response: responseText,
		};
	},
});
