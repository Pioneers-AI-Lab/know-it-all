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
3. Use the general-questions-query tool to search the knowledge base for answers to the query
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="General Questions Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → general-questions-query → data-formatter → response-sender.`,
	model: 'anthropic/claude-sonnet-4-20250514',
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
