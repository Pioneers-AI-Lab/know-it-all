import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './112df47d-a03d-48a7-b77b-8c58354d9e08.mjs';
import 'fs';
import 'path';
import 'url';

const workshopsQuery = createTool({
  id: "workshops-query",
  description: "Queries the timeline database to find information about workshops in the accelerator program",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant workshops")
  }),
  outputSchema: z.object({
    workshops: z.array(z.any()).describe("Matching workshop events from the timeline"),
    found: z.boolean().describe("Whether matching workshops were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("timeline.json");
    const results = [];
    if (data.timeline && Array.isArray(data.timeline)) {
      for (const phase of data.timeline) {
        if (phase.key_events && Array.isArray(phase.key_events)) {
          for (const event of phase.key_events) {
            const isWorkshop = event.name && event.name.toLowerCase().includes("workshop");
            const matchesQuery = searchInObject(event, query);
            if (isWorkshop && matchesQuery) {
              results.push({
                ...event,
                phase_name: phase.phase_name,
                phase_id: phase.phase_id,
                duration_weeks: phase.duration_weeks
              });
            }
          }
        }
      }
    }
    return {
      workshops: results.slice(0, 10),
      // Limit to top 10 results
      found: results.length > 0
    };
  }
});

export { workshopsQuery };
