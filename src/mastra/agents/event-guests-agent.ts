import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';

export const eventGuestsAgent = new Agent({
	id: 'event-guests-agent',
	name: 'event-guests-agent',
	description: 'Event Guests Agent is responsible for managing event guests',
	instructions: `You are an event guests agent. You are responsible for managing event guests.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Guests Agent"
3. Then, process the query and provide a response

Always use the query-receiver tool first when you receive a query.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
