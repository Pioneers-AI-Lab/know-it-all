import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './642883aa-9e5b-47b8-a162-ecfcefc62062.mjs';
import 'fs';
import 'path';
import 'url';

const startupsQuery = createTool({
  id: "startups-query",
  description: "Queries the startups database to find information about startups in the accelerator",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant startups")
  }),
  outputSchema: z.object({
    startups: z.array(z.any()).describe("Matching startup information from the database"),
    found: z.boolean().describe("Whether matching startups were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("startups.json");
    const results = [];
    if (data.startups && Array.isArray(data.startups)) {
      for (const startup of data.startups) {
        if (searchInObject(startup, query)) {
          results.push(startup);
        }
      }
    }
    return {
      startups: results.slice(0, 10),
      // Limit to top 10 results
      found: results.length > 0
    };
  }
});

export { startupsQuery };
