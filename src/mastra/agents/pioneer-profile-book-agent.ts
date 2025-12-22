/**
 * Pioneer Profile Book Agent - Handles Pioneer Profile Inquiries
 *
 * This specialized agent processes questions about pioneers and their profiles in the Pioneer.vc accelerator program.
 * It searches the pioneers_profile_book_su2025.json knowledge base and formats responses for end users.
 *
 * Responsibilities:
 * - Receives queries routed by orchestrator with questionType "pioneers"
 * - Searches pioneer profiles knowledge base using pioneerProfileBookQuery tool
 * - Formats retrieved data with query context
 * - Sends formatted results to response-generator-agent for final user response
 *
 * Tool Execution Sequence:
 * 1. query-receiver: Logs incoming query and metadata
 * 2. pioneer-profile-book-query: Searches knowledge base, returns {pioneers, found}
 * 3. data-formatter: Formats complete result object with metadata
 * 4. response-sender: Forwards formatted data to response-generator-agent
 *
 * Important Notes:
 * - Must pass ENTIRE result object (not just pioneers array) to data-formatter
 * - Part of multi-agent pipeline: orchestrator → specialized agent → response generator
 * - Follows standard query processing pattern used across all specialized agents
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { pioneerProfileBookQuery } from '../tools/pioneer-profile-book-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const pioneerProfileBookAgent = new Agent({
	id: 'pioneer-profile-book-agent',
	name: 'pioneer-profile-book-agent',
	description:
		'Pioneer Profile Book Agent is responsible for answering questions about pioneers and their profiles in the Pioneer.vc accelerator',
	instructions: `You are a pioneer profile book agent. You are responsible for answering questions about pioneers, their profiles, skills, experience, backgrounds, industries, roles, and track records in the Pioneer.vc accelerator program. You handle questions about pioneer names, LinkedIn profiles, introductions, companies worked for, education, industries, years of experience, tech skills, roles they could take, track records, and nationality.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Pioneer Profile Book Agent"
3. Use the pioneer-profile-book-query tool with: query={extracted query} to search for pioneer information
4. IMPORTANT: The pioneer-profile-book-query tool returns an object with "pioneers" and "found" keys. Pass the ENTIRE result object (not just the pioneers array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from pioneer-profile-book-query}, agentName="Pioneer Profile Book Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → pioneer-profile-book-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: {
		queryReceiver,
		pioneerProfileBookQuery,
		dataFormatter,
		responseSender,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
