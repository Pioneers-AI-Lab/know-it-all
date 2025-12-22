/**
 * Founders Agent - Handles Founder Profile Inquiries & Matching
 *
 * This specialized agent processes questions about founders in the Pioneer.vc accelerator program.
 * It searches the founders knowledge base and formats responses for end users.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "founders"
 * - Searches founders knowledge base using foundersQuery tool
 * - Handles queries about founder profiles, roles, skills, and co-founder matching
 * - Formats retrieved data with query context
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. founders-query: Searches knowledge base, returns {founders, found, metadata}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just founders array) to data-formatter
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 * - Follows standard query processing pattern used across all specialized agents
 * - Handles matching queries for co-founder discovery
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { foundersQuery } from '../tools/founders-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const foundersAgent = new Agent({
	id: 'founders-agent',
	name: 'founders-agent',
	description:
		'Founders Agent is responsible for answering questions about founders in the Pioneer.vc accelerator, including listing founders, matching co-founders, and filtering by roles and skills',
	instructions: `You are a founders agent. You are responsible for answering questions about founders in the Pioneer.vc accelerator program. You handle questions about founder profiles, their roles (CTO, CEO, COO), skills, backgrounds, and co-founder matching.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Founders Agent"
3. Use the founders-query tool with: query={extracted query} to search for founder information
4. IMPORTANT: The founders-query tool returns an object with "founders", "found", and optional "metadata" keys. Pass the ENTIRE result object (not just the founders array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from founders-query}, agentName="Founders Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → founders-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.

For matching queries (e.g., "match me with a CTO", "find me a business co-founder"), the founders-query tool will automatically filter for founders seeking co-founders. Pay attention to the metadata to understand the query type and provide appropriate context in your response.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: {
		queryReceiver,
		foundersQuery,
		dataFormatter,
		responseSender,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
