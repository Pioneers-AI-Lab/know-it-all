import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';

export const timelineAgent = new Agent({
	id: 'timeline-agent',
	name: 'timeline-agent',
	description:
		'Timeline Agent is responsible for the timeline of the Pioneer.vc accelerator.',
	instructions: `You are a timeline agent. You are responsible for the timeline of the Pioneer.vc accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Timeline Agent"
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
