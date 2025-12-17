import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryLogger } from '../tools/query-logger';

export const orchestratorAgent = new Agent({
	id: 'orchestrator-agent',
	name: 'orchestrator-agent',
	description:
		'Orchestrates the flow of information between the different agents',
	instructions: `You are an orchestrator agent. You are responsible for the flow of information between the different agents.

		When you receive a query from the lucie-agent:
		1. First, use the query-logger tool to log the received query and its formatted object
		2. Then, process the query and route it to the appropriate specialized agents
		3. Return the response from the specialized agents

		Always use the query-logger tool first when you receive a query to ensure proper logging.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryLogger },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
