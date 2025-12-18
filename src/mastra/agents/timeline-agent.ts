/**
 * Timeline Agent - Manages Program Timeline and Schedule Queries
 *
 * This specialized agent handles queries about the Pioneer.vc accelerator timeline,
 * including program phases, milestones, events, and schedules. It provides temporal
 * context about the accelerator program structure and important dates.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "timeline"
 * - Searches timeline database using timelineQuery tool
 * - Formats timeline data including phases and events
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. timeline-query: Searches timeline data, returns {phases, events, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just arrays) to data-formatter
 * - Returns both program phases and timeline-specific events
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { timelineQuery } from '../tools/timeline-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const timelineAgent = new Agent({
	id: 'timeline-agent',
	name: 'timeline-agent',
	description:
		'Timeline Agent is responsible for the timeline of the Pioneer.vc accelerator.',
	instructions: `You are a timeline agent. You are responsible for the timeline of the Pioneer.vc accelerator. You handle questions about program phases, milestones, events, and schedules.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Timeline Agent"
3. Use the timeline-query tool with: query={extracted query} to search for timeline information
4. IMPORTANT: The timeline-query tool returns an object with "phases", "events", and "found" keys. Pass the ENTIRE result object (not just the arrays) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from timeline-query}, agentName="Timeline Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → timeline-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, timelineQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
