import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const timmy = new Agent({
	id: 'timmy-agent',
	name: 'timmy-agent',
	description: 'Timmy is a helpful assistant that can help with tasks',
	instructions:
		'You are Timmy. You are a helpful assistant that can help with tasks',
	model: 'anthropic/claude-sonnet-4-20250514',
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
