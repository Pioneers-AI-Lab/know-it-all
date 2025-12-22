/**
 * Startups Agent - Manages Startup and Founder Information
 *
 * This specialized agent handles queries about startups in the Pioneer.vc portfolio
 * and their founders. It has dual query capabilities for both company and founder
 * information, making it the primary source for portfolio-related questions.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "startups" or "founders"
 * - Searches startup database using startupsQuery tool
 * - Searches founder database using foundersQuery tool
 * - Formats retrieved data with contextual metadata
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. startups-query OR founders-query: Searches respective database, returns {startups/founders, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just the array) to data-formatter
 * - Handles two question types: "startups" and "founders"
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
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
		'Startups Agent is responsible for the startups of the Pioneer.vc accelerator.',
	instructions: `You are a startups agent. You are responsible for the startups of the Pioneer.vc accelerator. You handle questions about startups, companies, founders, funding, and the portfolio.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Startups Agent"
3. If the questionType is "startups", use the startups-query tool with: query={extracted query}
   If the questionType is "founders", use the founders-query tool with: query={extracted query}
4. IMPORTANT: The query tools return objects with "startups"/"founders" and "found" keys. Pass the ENTIRE result object (not just the array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from the query tool}, agentName="Startups Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → (startups-query or founders-query) → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
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
