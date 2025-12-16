import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const orchestratorAgent = new Agent({
	id: 'orchestrator-agent',
	name: 'orchestrator-agent',
	description:
		'Orchestrates the flow of information between the different agents',
	instructions:
		'You are an orchestrator agent. You are responsible for the flow of information between the different agents. You are responsible for the flow of information between the different agents.',
	model: 'anthropic/claude-sonnet-4-20250514',
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
