import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInObject } from './112df47d-a03d-48a7-b77b-8c58354d9e08.mjs';
import 'fs';
import 'path';
import 'url';

const timelineQuery = createTool({
  id: "timeline-query",
  description: "Queries the timeline database to find information about program phases, events, and milestones",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant timeline information")
  }),
  outputSchema: z.object({
    phases: z.array(z.any()).describe("Matching phases from the timeline"),
    events: z.array(z.any()).describe("Matching events from the timeline"),
    found: z.boolean().describe("Whether matching timeline information was found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("timeline.json");
    const phaseResults = [];
    const eventResults = [];
    if (data.timeline && Array.isArray(data.timeline)) {
      for (const phase of data.timeline) {
        if (searchInObject(phase, query)) {
          phaseResults.push(phase);
        }
        if (phase.key_events && Array.isArray(phase.key_events)) {
          for (const event of phase.key_events) {
            if (searchInObject(event, query)) {
              eventResults.push({
                ...event,
                phase_name: phase.phase_name,
                phase_id: phase.phase_id
              });
            }
          }
        }
      }
    }
    return {
      phases: phaseResults.slice(0, 5),
      events: eventResults.slice(0, 10),
      found: phaseResults.length > 0 || eventResults.length > 0
    };
  }
});

export { timelineQuery };
