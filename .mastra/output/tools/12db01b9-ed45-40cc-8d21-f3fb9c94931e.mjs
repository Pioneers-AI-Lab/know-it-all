import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const orchestratorSender = createTool({
  id: "orchestrator-sender",
  description: "Sends an extracted query to the orchestrator-agent for routing and processing",
  inputSchema: z.object({
    query: z.string().describe("The extracted query to send to the orchestrator"),
    formatted: z.object({
      question: z.string(),
      type: z.string(),
      timestamp: z.string()
    }).describe("The formatted JSON object containing the question")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the query was successfully sent"),
    response: z.string().describe("The response from the orchestrator-agent")
  }),
  execute: async ({
    query,
    formatted
  }) => {
    const { mastra } = await import('../index2.mjs');
    const orchestratorAgent = mastra.getAgent("orchestratorAgent");
    if (!orchestratorAgent) {
      throw new Error("Orchestrator agent not found");
    }
    const message = `Process this query: ${query}

Formatted query object: ${JSON.stringify(
      formatted,
      null,
      2
    )}`;
    const response = await orchestratorAgent.generate(message);
    return {
      success: true,
      response: response.text || JSON.stringify(response)
    };
  }
});

export { orchestratorSender };
