import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { generalQuestionsQuery } from '../tools/general-questions-query';

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
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the general-questions-query tool to find relevant information.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, generalQuestionsQuery },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
