import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';

export const workshopsAgent = new Agent({
	id: 'workshops-agent',
	name: 'workshops-agent',
	description:
		'Workshops Agent is responsible for the workshops of the Pioneer.vc accelerator.',
	instructions: `You are a workshops agent. You are responsible for the workshops of the Pioneer.vc accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Workshops Agent"
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
