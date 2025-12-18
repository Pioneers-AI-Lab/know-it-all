/**
 * Query Router Tool - Intelligent Agent Routing Based on Question Type
 *
 * This tool implements the routing logic that directs queries from the orchestrator-agent
 * to the appropriate specialized agent based on the classified question type. Acts as the
 * central dispatcher in the multi-agent architecture.
 *
 * Purpose:
 * - Maps question types to corresponding specialized agents
 * - Invokes the correct agent with properly formatted query
 * - Handles agent-to-agent communication via Mastra's agent system
 * - Returns specialized agent responses back to orchestrator
 *
 * Routing Map:
 * - startups → startups-agent (company/portfolio queries)
 * - founders → startups-agent (founder-specific queries)
 * - events → event-agent (event information)
 * - guests → event-guests-agent (special guest events)
 * - workshops → workshops-agent (training sessions)
 * - timeline → timeline-agent (program schedule/phases)
 * - general → general-questions-agent (general accelerator questions)
 *
 * Pipeline Position:
 * Lucie → Orchestrator → Query Logger → [Query Router] → Specialized Agent → Response Generator
 *
 * Communication Flow:
 * 1. Receives query and questionType from orchestrator
 * 2. Formats message: "Question Type: {type}\n\nQuery: {query}"
 * 3. Invokes appropriate agent via Mastra.agent(name).generate()
 * 4. Returns agent's response to orchestrator
 *
 * Important Notes:
 * - All specialized agents must be registered in Mastra instance
 * - Agent names must match exactly (case-sensitive)
 * - Specialized agents expect specific message format
 * - Routing errors return descriptive failure messages
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
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
