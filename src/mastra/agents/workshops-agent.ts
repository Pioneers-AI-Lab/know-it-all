import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { workshopsQuery } from '../tools/workshops-query';

export const workshopsAgent = new Agent({
	id: 'workshops-agent',
	name: 'workshops-agent',
	description:
		'Workshops Agent is responsible for the workshops of the Pioneer.vc accelerator.',
	instructions: `You are a workshops agent. You are responsible for the workshops of the Pioneer.vc accelerator. You handle questions about workshops, training sessions, and learning activities.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Workshops Agent"
3. Use the workshops-query tool to search for workshop information in the timeline
4. Based on the results from the query tool, provide a comprehensive answer to the user

Always use the query-receiver tool first, then use the workshops-query tool to find relevant information.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, workshopsQuery },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
