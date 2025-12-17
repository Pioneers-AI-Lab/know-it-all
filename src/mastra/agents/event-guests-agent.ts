import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { guestsQuery } from '../tools/guests-query';

export const eventGuestsAgent = new Agent({
	id: 'event-guests-agent',
	name: 'event-guests-agent',
	description: 'Event Guests Agent is responsible for managing event guests',
	instructions: `You are an event guests agent. You are responsible for managing event guests and special guest events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Guests Agent"
3. Use the guests-query tool to search for information about guest speakers and their events
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the guests-query tool to find relevant information.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, guestsQuery },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
