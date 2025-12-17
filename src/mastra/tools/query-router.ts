import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Routes queries to the appropriate specialized agent based on question type.
 * This tool maps question types to their corresponding specialized agents and forwards the query.
 */
export const queryRouter = createTool({
	id: 'query-router',
	description:
		'Routes a query to the appropriate specialized agent based on the question type',
	inputSchema: z.object({
		query: z.string().describe('The query to route to a specialized agent'),
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
				agentName: 'startupsAgent',
				displayName: 'Startups Agent',
			},
			events: {
				agentName: 'eventAgent',
				displayName: 'Event Agent',
			},
			workshops: {
				agentName: 'workshopsAgent',
				displayName: 'Workshops Agent',
			},
			timeline: {
				agentName: 'timelineAgent',
				displayName: 'Timeline Agent',
			},
			founders: {
				agentName: 'startupsAgent', // Founders are handled by startups agent
				displayName: 'Startups Agent',
			},
			guests: {
				agentName: 'eventGuestsAgent',
				displayName: 'Event Guests Agent',
			},
			general: {
				agentName: 'generalQuestionsAgent',
				displayName: 'General Questions Agent',
			},
		};

		const mapping = agentMapping[questionType];
		if (!mapping) {
			throw new Error(
				`No agent mapping found for question type: ${questionType}`,
			);
		}

		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');
		// Get the specialized agent from the mastra instance
		const specializedAgent = mastra.getAgent(
			mapping.agentName as
				| 'startupsAgent'
				| 'eventAgent'
				| 'workshopsAgent'
				| 'timelineAgent'
				| 'eventGuestsAgent'
				| 'generalQuestionsAgent',
		);
		if (!specializedAgent) {
			throw new Error(
				`Specialized agent "${mapping.agentName}" not found`,
			);
		}

		// Create a message that includes the query and question type
		// The agent will use its query-receiver tool to log the incoming query
		const message = `Question Type: ${questionType}\n\nQuery: ${query}`;

		// Send the query to the specialized agent
		const response = await specializedAgent.generate(message);

		return {
			success: true,
			agentName: mapping.displayName,
			response: response.text || JSON.stringify(response),
		};
	},
});
