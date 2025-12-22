/**
 * Startups Agent - Handles Startup Company Inquiries
 *
 * This specialized agent processes questions about startups in the Pioneer.vc accelerator program.
 * It searches the startups knowledge base and formats responses for end users.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "startups"
 * - Searches startups knowledge base using startupsQuery tool
 * - Formats retrieved data with query context
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. startups-query: Searches knowledge base, returns {startups, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just startups array) to data-formatter
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 * - Follows standard query processing pattern used across all specialized agents
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { startupsQuery } from '../tools/startups-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const startupsAgent = new Agent({
	id: 'startups-agent',
	name: 'startups-agent',
	description:
		'Startups Agent is responsible for answering questions about startups in the Pioneer.vc accelerator',
	instructions: `You are a startups agent. You are responsible for answering questions about startups in the Pioneer.vc accelerator program. You handle questions about startup companies, their products, funding, teams, industries, and business models.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Startups Agent"
3. Use the startups-query tool with: query={extracted query} to search for startup information
4. IMPORTANT: The startups-query tool returns an object with "startups" and "found" keys. Pass the ENTIRE result object (not just the startups array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from startups-query}, agentName="Startups Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → startups-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-haiku-4-20250514',
	tools: {
		queryReceiver,
		startupsQuery,
		dataFormatter,
		responseSender,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
