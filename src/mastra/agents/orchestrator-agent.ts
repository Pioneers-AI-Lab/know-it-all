import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryLogger } from '../tools/query-logger';
import { queryRouter } from '../tools/query-router';

export const orchestratorAgent = new Agent({
	id: 'orchestrator-agent',
	name: 'orchestrator-agent',
	description:
		'Orchestrates the flow of information between the different agents',
	instructions: `You are an orchestrator agent. You are responsible for the flow of information between the different agents.

		When you receive a query from the lucie-agent:
		1. First, use the query-logger tool to log the received query and its formatted object
		2. Extract the questionType from the formatted object
		3. Use the query-router tool to route the query to the appropriate specialized agent based on the questionType
		4. Return the response from the specialized agent

		The questionType can be one of: startups, events, workshops, timeline, founders, guests, or general.
		Always use the query-logger tool first, then use the query-router tool to route the query.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryLogger, queryRouter },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
