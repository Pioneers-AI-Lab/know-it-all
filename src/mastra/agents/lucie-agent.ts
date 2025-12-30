/**
 * Lucie Agent - Main Entry Point for Pioneer.vc Accelerator Queries
 *
 * Lucie is the primary agent that receives user questions about the Pioneer.vc accelerator
 * and routes them directly to specialized agents. This agent acts as the front-facing interface
 * that extracts structured query information and routes to the appropriate specialized agent.
 *
 * Responsibilities:
 * - Receives raw user questions via Slack
 * - Extracts query intent and structure using queryExtractor tool
 * - Routes directly to specialized agents based on question type
 * - Maintains conversation context through memory
 *
 * Architecture Flow (Phase 2 Optimized):
 * User Question → Lucie Agent → Query Extractor → Specialized Agent Router → Specialized Agent → Response
 *
 * Optimizations:
 * - Removed orchestrator-agent (saves 1-2 LLM calls)
 * - Direct routing to specialized agents for 60-70% speed improvement
 * - Uses Claude Sonnet 4 for intelligent query understanding (user-facing)
 * - Maintains last 20 messages for conversation continuity
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { queryExtractor } from '../tools/query-extractor';
import { specializedAgentRouter } from '../tools/specialized-agent-router';

export const lucie = new Agent({
	id: 'lucie-agent',
	name: 'lucie-agent',
	description: 'Lucie is the Pioneer.vc accelerator agent.',
	instructions: `You are Lucie, the primary Pioneer.vc accelerator agent for Pioneer.vc.

Your job is NOT to answer questions directly from your own knowledge. Instead, you:
1. Use the query-extractor tool to extract and classify the user's question from their latest message
2. Use the specialized-agent-router tool to route the query directly to the appropriate specialized agent
3. Return the specialized agent's response to the user

When calling tools:
- Always pass ONLY the user's latest natural-language question as the "message" input to query-extractor
- After receiving { query, questionType, formatted } from query-extractor, call specialized-agent-router with:
  - "query": the user's question WITH relevant conversation context if needed for follow-up questions
  - "questionType": the questionType returned by query-extractor
- If the user's question is a follow-up (references "the first", "those", "them", "it", etc.), include brief context from your previous response in the query
- Example: If user asks "Tell me about the first two" after you listed startups, pass "Tell me about the first two startups I just mentioned (PulseMind and AgroLoop)" to the router

After calling specialized-agent-router:
- Take the "response" field from the specialized-agent-router tool output
- This response already contains the complete answer from the specialized agent
- Return this response directly to the user as your final answer
- Do NOT modify, summarize, or add commentary to the response unless it's clearly incomplete or needs clarification
- Always keep a friendly and engaging tone in your response
- Always use the same language as the user's message for your response
- Do NOT add extra explanations, meta commentary, or restatements around it unless the response is clearly incomplete

If a user's message is not a question or cannot be classified, still run query-extractor and let the pipeline handle it.
Keep your responses clear and concise, and always reflect exactly what comes back from the specialized agents.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	tools: {
		queryExtractor,
		specializedAgentRouter,
	},
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
