/**
 * Main Mastra Instance Configuration
 *
 * This is the central configuration file that initializes the Mastra framework
 * with all agents, workflows, storage, and API routes for the Slack bot system.
 *
 * Architecture:
 * - Agents: AI agents that handle Slack conversations (reverseAgent, capsAgent)
 * - Workflows: Multi-step processes that agents can invoke (reverseWorkflow)
 * - Storage: LibSQL (SQLite) database for conversation memory and state
 * - Server: API routes for Slack webhook endpoints
 *
 * The Mastra instance is exported and used by:
 * - Slack route handlers to get agents and process messages
 * - CLI commands (mastra dev, mastra build, mastra start)
 *
 * Important Notes:
 * - Database file is created at ./mastra.db in the project root
 * - supports-color must be externalized to prevent bundler issues
 * - Each agent must be registered here to be accessible via mastra.getAgent()
 * - slackRoutes array creates webhook endpoints for each Slack app
 */

import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { lucie } from './agents/lucie-agent';
import { orchestratorAgent } from './agents/orchestrator-agent';
import { generalQuestionsAgent } from './agents/general-questions-agent';
import { eventAgent } from './agents/event-agent';
import { startupsAgent } from './agents/startups-agent';
import { foundersAgent } from './agents/founders-agent';
import { responseGeneratorAgent } from './agents/response-generator-agent';
import { slackRoutes } from './slack/routes';

export const mastra = new Mastra({
	// Registered agents - keys must match agentName in slack/routes.ts
	agents: {
		lucie,
		orchestratorAgent,
		generalQuestionsAgent,
		eventAgent,
		startupsAgent,
		foundersAgent,
		responseGeneratorAgent,
	},

	// Registered workflows - available to agents via their workflows config
	workflows: {},

	// Local SQLite storage for conversation memory and agent state
	storage: new LibSQLStore({
		id: 'mastra',
		url: 'file:./mastra.db',
	}),

	// API server configuration with Slack webhook routes
	server: {
		apiRoutes: slackRoutes,
	},

	// Bundler configuration to prevent module resolution issues
	bundler: {
		externals: ['supports-color'],
	},
});
