/**
 * Response Generator Agent - Final Response Synthesis and Formatting
 *
 * This agent serves as the final step in the multi-agent pipeline, receiving formatted data
 * from specialized agents and generating clear, comprehensive, user-facing responses.
 * It transforms structured data into natural language responses for Slack users.
 *
 * Responsibilities:
 * - Receives formatted data objects from specialized agents via response-sender tool
 * - Extracts and processes JSON data containing query results and metadata
 * - Logs received data using formatted-data-receiver tool
 * - Generates natural language responses based on relevantData field
 * - Returns final user-facing message to complete the query pipeline
 *
 * Input Data Structure:
 * - query: Original user query
 * - questionType: Type of question (events, startups, workshops, etc.)
 * - agentName: Name of specialized agent that processed the query
 * - summary: Brief summary of retrieved data
 * - relevantData: Actual data retrieved from JSON knowledge base
 * - timestamp: When data was formatted
 *
 * Architecture Flow:
 * Specialized Agent → response-sender → Response Generator → User Response
 *
 * Important Notes:
 * - Always uses formatted-data-receiver tool first to log incoming data
 * - Synthesizes responses from relevantData field, not just summary
 * - Final agent in the pipeline - output goes directly to user
 */

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

CRITICAL: When the user asks for specific data (like "list all names", "give me the full_name", "show me all X"), you MUST:
- Extract the exact fields requested from the relevantData
- Display the actual values, not just summarize
- If asked for a list, provide the complete list with all items
- If asked for specific fields, extract and display those exact fields from each item
- Use the relevantData array/object directly to extract the requested information

For example:
- If user asks "give me the full_name of all founders" → Extract full_name from each founder in relevantData and list them all
- If user asks "list all startup names" → Extract the name field from each startup in relevantData and list them all
- If user asks for specific information → Extract and display that exact information from relevantData

Do NOT just summarize or say "the data is available" - actually extract and display the requested information from relevantData.

Always use the formatted-data-receiver tool first to log the data, then generate your response using the relevantData.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: { formattedDataReceiver },
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
