import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { startupsQuery } from '../tools/startups-query';
import { foundersQuery } from '../tools/founders-query';
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
3. Use the startups-query tool to search for startup information, or the founders-query tool if the question is about founders
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Startups Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → (startups-query or founders-query) → data-formatter → response-sender.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: {
		queryReceiver,
		startupsQuery,
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
