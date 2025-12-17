import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';

export const generalQuestionsAgent = new Agent({
	id: 'general-questions-agent',
	name: 'general-questions-agent',
	description:
		'General Questions Agent is responsible for answering general questions',
	instructions: `You are a general questions agent. You are responsible for answering general questions.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="General Questions Agent"
3. Then, process the query and provide a response

Always use the query-receiver tool first when you receive a query.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
