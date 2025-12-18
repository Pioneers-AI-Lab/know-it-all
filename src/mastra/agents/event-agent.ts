/**
 * Event Agent - Manages Event Information and Queries
 *
 * This specialized agent handles all queries related to events in the Pioneer.vc accelerator.
 * It searches event data and returns formatted information about accelerator events, dates,
 * locations, and other event-specific details.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "events"
 * - Searches event database using eventsQuery tool
 * - Formats event data with contextual metadata
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. events-query: Searches event data, returns {events, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just events array) to data-formatter
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 * - Follows standard query processing pattern used across all specialized agents
 */

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
3. Use the events-query tool with: query={extracted query} to search for event information
4. IMPORTANT: The events-query tool returns an object with "events" and "found" keys. Pass the ENTIRE result object (not just the events array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from events-query}, agentName="Event Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → events-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, eventsQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
