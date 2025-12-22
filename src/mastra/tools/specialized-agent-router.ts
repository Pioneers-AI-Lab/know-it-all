/**
 * Specialized Agent Router Tool - Direct Query Routing to Specialized Agents
 *
 * This tool directly routes queries from the Lucie agent to the appropriate specialized agent
 * based on the question type, bypassing the orchestrator agent for improved performance.
 *
 * Purpose:
 * - Acts as a direct bridge between Lucie agent and specialized agents
 * - Routes queries based on questionType classification
 * - Invokes appropriate specialized agent with user's query
 * - Returns specialized agent's response back to Lucie agent
 *
 * Phase 2 Optimization:
 * - Eliminates orchestrator-agent (saves 1-2 LLM calls)
 * - Eliminates query-router tool
 * - Direct routing via simple mapping logic
 *
 * Pipeline Position (Optimized):
 * Lucie Agent → Query Extractor → [Specialized Agent Router] → Specialized Agent → User
 *
 * Input:
 * - query: The user's question
 * - questionType: The classified question type (startups, events, founders, pioneers, general)
 *
 * Output:
 * - success: Whether the specialized agent processed the query
 * - agentName: Name of the agent that handled the query
 * - response: The specialized agent's final response
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { message, log, error } from '../../lib/print-helpers';

export const specializedAgentRouter = createTool({
	id: 'specialized-agent-router',
	description:
		'Routes a query directly to the appropriate specialized agent based on the question type',
	inputSchema: z.object({
		query: z
			.string()
			.describe('The user query to route to a specialized agent'),
		questionType: z
			.enum([
				'startups',
				'events',
				'founders',
				'pioneers',
				'sessions',
				'general',
			])
			.describe(
				'The type of question determining which agent to route to',
			),
		threadId: z
			.string()
			.optional()
			.describe('Thread ID for maintaining conversation context'),
		resourceId: z
			.string()
			.optional()
			.describe('Resource ID for maintaining conversation context'),
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
	execute: async (
		{
			query,
			questionType,
			threadId: inputThreadId,
			resourceId: inputResourceId,
		},
		context,
	): Promise<{
		success: boolean;
		agentName: string;
		response: string;
	}> => {
		// Try to get threadId and resourceId from explicit parameters first,
		// then fall back to execution context if Mastra provides it
		const threadId =
			inputThreadId ||
			(context && 'threadId' in context
				? (context as any).threadId
				: undefined);
		const resourceId =
			inputResourceId ||
			(context && 'resourceId' in context
				? (context as any).resourceId
				: undefined);

		message(
			'🎯 SPECIALIZED AGENT ROUTER - Routing query directly to specialized agent',
		);
		log('Question type:', questionType);
		log('Query:', query);

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
				agentName: 'sessionEventGridAgent',
				displayName: 'Calendar Agent',
			},
			founders: {
				agentName: 'foundersAgent',
				displayName: 'Founders Agent',
			},
			pioneers: {
				agentName: 'pioneerProfileBookAgent',
				displayName: 'Pioneer Profile Book Agent',
			},
			sessions: {
				agentName: 'sessionEventGridAgent',
				displayName: 'Session Event Grid Agent',
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

		// Lazy import to avoid circular dependency
		const { mastra } = await import('../index');

		// Get the specialized agent from the mastra instance
		const specializedAgent = mastra.getAgent(
			mapping.agentName as
				| 'lucie'
				| 'generalQuestionsAgent'
				| 'pioneerProfileBookAgent'
				| 'sessionEventGridAgent',
		);

		if (!specializedAgent) {
			error(
				`Specialized agent "${mapping.agentName}" not found`,
				mapping,
			);
			throw new Error(
				`Specialized agent "${mapping.agentName}" not found`,
			);
		}

		// Send the query directly to the specialized agent
		// Pass through threadId and resourceId to maintain conversation context
		message(`🎯 SPECIALIZED AGENT ROUTER - Calling ${mapping.displayName}`);
		log('Query sent:', query);

		if (threadId || resourceId) {
			log('Thread context:', { threadId, resourceId });
		}

		// Build options object for context if available
		const generateOptions: { threadId?: string; resourceId?: string } = {};
		if (threadId) generateOptions.threadId = threadId;
		if (resourceId) generateOptions.resourceId = resourceId;

		const response = await specializedAgent.generate(
			query,
			Object.keys(generateOptions).length > 0
				? generateOptions
				: undefined,
		);

		const responseText = response.text || JSON.stringify(response);

		message(
			`✅ SPECIALIZED AGENT ROUTER - Received response from ${mapping.displayName}`,
		);

		return {
			success: true,
			agentName: mapping.displayName,
			response: responseText,
		};
	},
});
