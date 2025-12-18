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
	instructions: `You are Lucie. You are the Pioneer.vc accelerator agent. You are responsible for answering questions about the Pioneer.vc accelerator.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
