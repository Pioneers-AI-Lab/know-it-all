import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const dataFormatter = createTool({
  id: "data-formatter",
  description: "Formats retrieved data from JSON files into a structured format suitable for generating user responses",
  inputSchema: z.object({
    query: z.string().describe("The original user query"),
    questionType: z.enum([
      "startups",
      "events",
      "workshops",
      "timeline",
      "founders",
      "guests",
      "general"
    ]).describe("The type of question"),
    data: z.any().describe("The raw data retrieved from the JSON file"),
    agentName: z.string().describe("The name of the agent that retrieved the data")
  }),
  outputSchema: z.object({
    formatted: z.object({
      query: z.string(),
      questionType: z.string(),
      agentName: z.string(),
      summary: z.string(),
      relevantData: z.any(),
      timestamp: z.string()
    }).describe("The formatted data ready for the response generator")
  }),
  execute: async ({ query, questionType, data, agentName }) => {
    let summary = "";
    let relevantData = data;
    if (Array.isArray(data)) {
      if (data.length > 0) {
        summary = `Found ${data.length} matching result(s) for the query.`;
        relevantData = data;
      } else {
        summary = "No matching results found for the query.";
        relevantData = [];
      }
    } else if (data && typeof data === "object") {
      if (data.answers && Array.isArray(data.answers)) {
        summary = `Found ${data.answers.length} matching answer(s) in the knowledge base.`;
        relevantData = data.answers;
      } else if (data.startups && Array.isArray(data.startups)) {
        summary = `Found ${data.startups.length} matching startup(s).`;
        relevantData = data.startups;
      } else if (data.events && Array.isArray(data.events)) {
        summary = `Found ${data.events.length} matching event(s).`;
        relevantData = data.events;
      } else if (data.founders && Array.isArray(data.founders)) {
        summary = `Found ${data.founders.length} matching founder(s).`;
        relevantData = data.founders;
      } else if (data.phases || data.events) {
        const phaseCount = data.phases?.length || 0;
        const eventCount = data.events?.length || 0;
        summary = `Found ${phaseCount} phase(s) and ${eventCount} event(s).`;
        relevantData = data;
      } else {
        summary = "Retrieved data from the knowledge base.";
        relevantData = data;
      }
    } else {
      summary = "Data retrieved successfully.";
      relevantData = data;
    }
    const formatted = {
      query,
      questionType,
      agentName,
      summary,
      relevantData,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    return { formatted };
  }
});

export { dataFormatter };
