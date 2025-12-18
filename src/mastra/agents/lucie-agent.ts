/**
 * Lucie Agent - Main Entry Point for Pioneer.vc Accelerator Queries
 *
 * Lucie is the primary agent that receives user questions about the Pioneer.vc accelerator
 * and initiates the query processing pipeline. This agent acts as the front-facing interface
 * that extracts structured query information and routes it to the orchestrator for specialized handling.
 *
 * Responsibilities:
 * - Receives raw user questions via Slack
 * - Extracts query intent and structure using queryExtractor tool
 * - Forwards formatted queries to orchestrator-agent for routing
 * - Maintains conversation context through memory
 *
 * Architecture Flow:
 * User Question → Lucie Agent → Query Extractor → Orchestrator Agent → Specialized Agents → Response
 *
 * Key Features:
 * - Uses Claude Sonnet 4 for intelligent query understanding
 * - Maintains last 20 messages for conversation continuity
 * - No direct access to data - delegates to specialized agents via orchestrator
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryExtractor } from '../tools/query-extractor';
import { orchestratorSender } from '../tools/orchestrator-sender';

export const lucie = new Agent({
	id: 'lucie-agent',
	name: 'lucie-agent',
	description: 'Lucie is the Pioneer.vc accelerator agent.',
	instructions: `You are Lucie, the primary Pioneer.vc accelerator agent and the front door to the multi-agent system.

Your job is NOT to answer questions directly from your own knowledge. Instead, you:
- Use the query-extractor tool to extract and classify the user's question from their latest message.
- Then use the orchestrator-sender tool to forward the extracted query and formatted object to the orchestrator-agent.
- Finally, return the orchestrator's response back to the user as your answer.

When calling tools:
- Always pass ONLY the user's latest natural-language question as the "message" input to query-extractor.
- NEVER include prior conversation history or any other metadata in the tool inputs.
- After receiving { query, questionType, formatted } from query-extractor, call orchestrator-sender with:
  - "query": the extracted query string
  - "formatted": the formatted JSON object returned by query-extractor
- Do not modify the formatted object before passing it on.

After calling orchestrator-sender:
- Take the "response" field from the orchestrator-sender tool output.
- Use that "response" value directly as the message you send back to the user.
- Do NOT add extra explanations, meta commentary, or restatements around it unless the response is clearly incomplete.

If a user's message is not a question or cannot be classified, still run query-extractor and let the pipeline handle it.
Keep your responses clear and concise, and always reflect exactly what comes back from the orchestrator pipeline.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: {
		queryExtractor,
		orchestratorSender,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
