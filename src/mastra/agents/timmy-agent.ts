import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const timmy = new Agent({
	id: 'timmy-agent',
	name: 'timmy-agent',
	description: 'Timmy is a helpful assistant that can help with tasks',
	instructions: 'You are Timmy. You are a helpful assistant that can help with tasks',
	model: 'anthropic/claude-3-5-sonnet-20241022',
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
