import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './112df47d-a03d-48a7-b77b-8c58354d9e08.mjs';
import 'fs';
import 'path';
import 'url';

const eventsQuery = createTool({
  id: "events-query",
  description: "Queries the calendar events database to find information about events in the accelerator",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant events")
  }),
  outputSchema: z.object({
    events: z.array(z.any()).describe("Matching events from the database"),
    found: z.boolean().describe("Whether matching events were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("calendar-events.json");
    const results = [];
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (searchInObject(event, query)) {
          results.push(event);
        }
      }
    }
    return {
      events: results.slice(0, 10),
      // Limit to top 10 results
      found: results.length > 0
    };
  }
});

export { eventsQuery };
