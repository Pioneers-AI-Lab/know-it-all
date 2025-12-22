/**
 * General Questions Agent - Handles General Accelerator Inquiries
 *
 * This specialized agent processes general questions about the Pioneer.vc accelerator program
 * that don't fit into specific categories like events, startups, or workshops. It searches
 * a knowledge base and formats responses for end users.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "general"
 * - Searches general knowledge base using generalQuestionsQuery tool
 * - Formats retrieved data with query context
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. general-questions-query: Searches knowledge base, returns {answers, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just answers array) to data-formatter
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 * - Follows standard query processing pattern used across all specialized agents
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { generalQuestionsQuery } from '../tools/general-questions-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const generalQuestionsAgent = new Agent({
	id: 'general-questions-agent',
	name: 'general-questions-agent',
	description:
		'General Questions Agent is responsible for answering general questions',
	instructions: `You are a general questions agent. You are responsible for answering general questions about the Pioneers accelerator program.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="General Questions Agent"
3. Use the general-questions-query tool with: query={extracted query} to search the knowledge base
4. IMPORTANT: The general-questions-query tool returns an object with "answers" and "found" keys. Pass the ENTIRE result object (not just the answers array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from general-questions-query}, agentName="General Questions Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → general-questions-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-haiku-4-20250514',
	tools: {
		queryReceiver,
		generalQuestionsQuery,
		dataFormatter,
		responseSender,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
