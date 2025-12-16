import { Agent } from '@mastra/core/agent';

export const reponseGeneratorAgent = new Agent({
	name: 'Reponse Generator Agent',
	instructions: `
		You are a Slack bot assistant. Keep your responses concise and to the point.

    - Do not tag users.
    - Current date is: ${new Date().toISOString().split('T')[0]}
    - Make sure to ALWAYS include sources in your final response if you use web search. Put sources inline if possible.
	`,
	model: 'anthropic/claude-sonnet-4-5-20250929',
});
