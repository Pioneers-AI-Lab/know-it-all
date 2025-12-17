import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { timelineQuery } from '../tools/timeline-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

export const timelineAgent = new Agent({
	id: 'timeline-agent',
	name: 'timeline-agent',
	description:
		'Timeline Agent is responsible for the timeline of the Pioneer.vc accelerator.',
	instructions: `You are a timeline agent. You are responsible for the timeline of the Pioneer.vc accelerator. You handle questions about program phases, milestones, events, and schedules.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Timeline Agent"
3. Use the timeline-query tool to search for timeline information including phases and events
4. Use the data-formatter tool to format the retrieved data: query={extracted query}, questionType={extracted questionType}, data={results from query tool}, agentName="Timeline Agent"
5. Use the response-sender tool to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → timeline-query → data-formatter → response-sender.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, timelineQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
