import { Agent } from '@mastra/core/agent';

export const eventAgent = new Agent({
	id: 'event-agent',
	name: 'event-agent',
	description: 'Event Agent is responsible for managing events',
	instructions: `You are a event agent. You are responsible for managing events.`,
	model: 'anthropic/claude-sonnet-4-20250514',
});
