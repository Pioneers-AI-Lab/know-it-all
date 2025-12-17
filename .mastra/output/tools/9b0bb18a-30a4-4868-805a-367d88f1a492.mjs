import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const queryReceiver = createTool({
  id: "query-receiver",
  description: "Logs the received query when a specialized agent receives a query from the orchestrator",
  inputSchema: z.object({
    query: z.string().describe("The query string received from the orchestrator"),
    questionType: z.enum([
      "startups",
      "events",
      "workshops",
      "timeline",
      "founders",
      "guests",
      "general"
    ]).describe("The type of question"),
    agentName: z.string().describe("The name of the specialized agent receiving the query")
  }),
  outputSchema: z.object({
    logged: z.boolean().describe("Whether the query was successfully logged")
  }),
  execute: async ({ query, questionType, agentName }) => {
    console.log("=".repeat(60));
    console.log(`\u{1F4E8} ${agentName.toUpperCase()} - Received Query`);
    console.log("=".repeat(60));
    console.log("Query:", query);
    console.log("Question Type:", questionType);
    console.log("Received at:", (/* @__PURE__ */ new Date()).toISOString());
    console.log("=".repeat(60));
    return { logged: true };
  }
});

export { queryReceiver };
