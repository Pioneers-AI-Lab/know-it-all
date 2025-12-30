import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log, error } from '../../lib/print-helpers';
export const queryRouter = createTool({
	id: 'query-router',
	description:
		'Routes a query to the appropriate specialized agent based on the question type',
	inputSchema: z.object({
		query: z.string().describe('The query to route to a specialized agent'),
		questionType: z
			.enum(['startups', 'events', 'founders', 'pioneers', 'general'])
			.describe(
				'The type of question determining which agent to route to',
			),
	}),
	outputSchema: z.object({
		success: z
			.boolean()
			.describe('Whether the query was successfully routed'),
		agentName: z
			.string()
			.describe('The name of the agent that handled the query'),
		response: z
			.string()
			.describe('The response from the specialized agent'),
	}),
	execute: async ({
		query,
		questionType,
	}): Promise<{
		success: boolean;
		agentName: string;
		response: string;
	}> => {
		// Map question types to agent names
		const agentMapping: Record<
			string,
			{
				agentName: string;
				displayName: string;
			}
		> = {
			startups: {
				agentName: 'startupBookAgent',
				displayName: 'Startups Agent',
			},
			events: {
				agentName: 'sessionEventGridAgent',
				displayName: 'Calendar Agent',
			},
			founders: {
				agentName: 'foundersAgent', // Founders are handled by founders agent
				displayName: 'Founders Agent',
			},
			pioneers: {
				agentName: 'pioneerProfileBookAgent',
				displayName: 'Pioneer Profile Book Agent',
			},
			general: {
				agentName: 'generalQuestionsAgent',
				displayName: 'General Questions Agent',
			},
		};

		const mapping = agentMapping[questionType];
		if (!mapping) {
			error('No agent mapping found for question type:', questionType);
			throw new Error(
				`No agent mapping found for question type: ${questionType}`,
			);
		}

		// log('Resolved mapping:', JSON.stringify(mapping));

		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the specialized agent from the mastra instance
		const specializedAgent = mastra.getAgent(mapping.agentName as 'lucie');
		if (!specializedAgent) {
			error(
				`Specialized agent "${mapping.agentName}" not found`,
				mapping,
			);
			throw new Error(
				`Specialized agent "${mapping.agentName}" not found`,
			);
		}

		// Create a message that includes the query and question type
		// The agent will use its query-receiver tool to log the incoming query
		const agentMessage = `Question Type: ${questionType}\n\nQuery: ${query}`;

		// Send the query to the specialized agent
		message(
			`🧭 QUERY ROUTER - Calling specialized agent: ${mapping.agentName}`,
		);
		log('Message sent:', agentMessage);

		const response = await specializedAgent.generate(agentMessage);

		const responseText = response.text || JSON.stringify(response);

		message(
			`✅ QUERY ROUTER - Received response from ${mapping.agentName}`,
		);

		return {
			success: true,
			agentName: mapping.displayName,
			response: responseText,
		};
	},
});
