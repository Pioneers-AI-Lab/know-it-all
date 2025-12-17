import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { eventsQuery } from '../tools/events-query';

export const eventAgent = new Agent({
	id: 'event-agent',
	name: 'event-agent',
	description: 'Event Agent is responsible for managing events',
	instructions: `You are an event agent. You are responsible for managing events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Agent"
3. Use the events-query tool to search for event information in the calendar
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the events-query tool to find relevant information.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, eventsQuery },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
