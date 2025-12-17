import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const generalQuestionsAgent = new Agent({
	id: 'general-questions-agent',
	name: 'general-questions-agent',
	description:
		'General Questions Agent is responsible for answering general questions',
	instructions: `You are a general questions agent. You are responsible for answering general questions.`,
	model: 'anthropic/claude-sonnet-4-20250514',
	memory: new Memory({
		options: {
			lastMessages: 20,
		},
	}),
});
