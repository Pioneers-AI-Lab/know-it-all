import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryReceiver } from '../tools/query-receiver';
import { workshopsQuery } from '../tools/workshops-query';
import { dataFormatter } from '../tools/data-formatter';
import { responseSender } from '../tools/response-sender';

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
3. Use the workshops-query tool with: query={extracted query} to search for workshop information
4. IMPORTANT: The workshops-query tool returns an object with "workshops" and "found" keys. Pass the ENTIRE result object (not just the workshops array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from workshops-query}, agentName="Workshops Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver → workshops-query → data-formatter → response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { queryReceiver, workshopsQuery, dataFormatter, responseSender },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
