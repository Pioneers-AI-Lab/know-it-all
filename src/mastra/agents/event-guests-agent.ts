import { Agent } from '@mastra/core/agent';

export const eventGuestsAgent = new Agent({
	id: 'event-guests-agent',
	name: 'event-guests-agent',
	description: 'Event Guests Agent is responsible for managing event guests',
	instructions: `You are a event guests agent. You are responsible for managing event guests.`,
	model: 'anthropic/claude-sonnet-4-20250514',
});
