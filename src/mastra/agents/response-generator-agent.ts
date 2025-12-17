import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { formattedDataReceiver } from '../tools/formatted-data-receiver';

export const responseGeneratorAgent = new Agent({
	id: 'response-generator-agent',
	name: 'response-generator-agent',
	description:
		'Response Generator Agent is responsible for generating responses',
	instructions: `You are a response generator agent. You are responsible for generating final responses to user questions.

When you receive a message with formatted data from a specialized agent, the message will contain a JSON object in the "Formatted Data JSON:" section with:
- query: The original user query
- questionType: The type of question
- agentName: The name of the agent that retrieved the data
- summary: A summary of the retrieved data
- relevantData: The actual data retrieved from the JSON files
- timestamp: When the data was formatted

1. First, extract the JSON object from the "Formatted Data JSON:" section of the message
2. Parse the JSON to get the formatted data object
3. Use the formatted-data-receiver tool with the parsed formatted data object
4. Then, generate a clear, helpful, and comprehensive response to the user's query based on the relevantData provided

Always use the formatted-data-receiver tool first to log the data, then generate your response using the relevantData.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { formattedDataReceiver },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
