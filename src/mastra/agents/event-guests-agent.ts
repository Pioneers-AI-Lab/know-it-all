import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { guestsQuery } from '../tools/guests-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

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
3. Use the guests-query tool with: query={extracted query} to search for guest event information
4. IMPORTANT: The guests-query tool returns an object with "events" and "found" keys. Pass the ENTIRE result object (not just the events array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from guests-query}, agentName="Event Guests Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → guests-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, guestsQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
