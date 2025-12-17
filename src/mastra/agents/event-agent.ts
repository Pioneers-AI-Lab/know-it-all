import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { eventsQuery } from '../tools/events-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

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
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Event Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → events-query → data-formatter → response-sender.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, eventsQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
