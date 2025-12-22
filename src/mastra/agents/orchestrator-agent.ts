/**
 * Orchestrator Agent - Query Router and Traffic Controller
 *
 * The orchestrator acts as a central routing hub that receives queries from the Lucie agent
 * and directs them to the appropriate specialized agent based on question type. This agent
 * implements a hub-and-spoke pattern for managing multi-agent workflows.
 *
 * Responsibilities:
 * - Receives formatted queries from Lucie agent
 * - Logs incoming queries for debugging and monitoring
 * - Routes queries to specialized agents based on questionType
 * - Returns responses from specialized agents back to the caller
 *
 * Supported Question Types:
 * - startups: Routes to startups-agent (company/founder queries)
 * - events: Routes to event-agent (event information)
 * - workshops: Routes to workshops-agent (training sessions)
 * - timeline: Routes to timeline-agent (program phases/schedules)
 * - founders: Routes to startups-agent (founder information)
 * - guests: Routes to event-guests-agent (special guest events)
 * - general: Routes to general-questions-agent (general accelerator questions)
 *
 * Architecture Pattern:
 * Lucie → Orchestrator → [Specialized Agent] → Response Generator → User
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryRouter } from '../tools/query-router';

export const orchestratorAgent = new Agent({
	id: 'orchestrator-agent',
	name: 'orchestrator-agent',
	description:
		'Orchestrates the flow of information between the different agents',
	instructions: `You are an orchestrator agent. You are responsible for the flow of information between the different agents.

		When you receive a query from the lucie-agent:
		1. Extract the questionType from the formatted object
		2. Use the query-router tool to route the query to the appropriate specialized agent based on the questionType
		3. Return the response from the specialized agent

		The questionType can be one of: startups, events, founders, pioneers, or general.
		Always use the query-router tool to route the query.`,
	model: 'anthropic/claude-haiku-4-20250514',
	tools: { queryRouter },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
