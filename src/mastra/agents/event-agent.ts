import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';

export const eventAgent = new Agent({
	id: 'event-agent',
	name: 'event-agent',
	description: 'Event Agent is responsible for managing events',
	instructions: `You are an event agent. You are responsible for managing events.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Agent"
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
