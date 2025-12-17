import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const queryExtractor = createTool({
  id: "query-extractor",
  description: "Extracts the user's question from their message and formats it into a structured JSON object",
  inputSchema: z.object({
    message: z.string().describe("The user's message containing a question")
  }),
  outputSchema: z.object({
    query: z.string().describe("The extracted question"),
    questionType: z.enum([
      "startups",
      "events",
      "workshops",
      "timeline",
      "founders",
      "guests",
      "general"
    ]).describe("The type of question based on data categories"),
    formatted: z.object({
      question: z.string(),
      type: z.string(),
      timestamp: z.string()
    }).describe("The formatted JSON object containing the question")
  }),
  execute: async ({ message: message2 }) => {
    const cleanedMessage = message2.trim().replace(/\s+/g, " ");
    let query = cleanedMessage.replace(
      /^(can you|could you|would you|please|tell me|i want to know|i need to know|i'm asking|i ask)\s+/i,
      ""
    ).trim();
    if (!query.endsWith("?") && !query.endsWith(".")) {
      query += "?";
    }
    const dataTypeKeywords = {
      startups: [
        /startup/i,
        /company/i,
        /companies/i,
        /business/i,
        /venture/i,
        /portfolio/i,
        /funding/i,
        /investment/i,
        /raised/i,
        /traction/i,
        /mrr/i,
        /revenue/i
      ],
      events: [
        /event/i,
        /events/i,
        /calendar/i,
        /schedule/i,
        /scheduled/i,
        /meeting/i,
        /meetings/i,
        /session/i,
        /sessions/i,
        /fireside/i,
        /ama/i
      ],
      workshops: [
        /workshop/i,
        /workshops/i,
        /training/i,
        /seminar/i,
        /learning/i,
        /curriculum/i
      ],
      timeline: [
        /timeline/i,
        /phase/i,
        /phases/i,
        /program/i,
        /cohort/i,
        /schedule/i,
        /duration/i,
        /week/i,
        /weeks/i,
        /milestone/i,
        /milestones/i
      ],
      founders: [
        /founder/i,
        /founders/i,
        /entrepreneur/i,
        /entrepreneurs/i,
        /ceo/i,
        /cto/i,
        /co-founder/i,
        /team/i,
        /background/i,
        /experience/i
      ],
      guests: [
        /guest/i,
        /guests/i,
        /speaker/i,
        /speakers/i,
        /invited/i,
        /special guest/i,
        /visiting/i
      ]
    };
    const queryLower = query.toLowerCase();
    let questionType = "general";
    for (const [type, patterns] of Object.entries(dataTypeKeywords)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          questionType = type;
          break;
        }
      }
      if (questionType !== "general") break;
    }
    const formatted = {
      question: query,
      type: questionType,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    return {
      query,
      questionType,
      formatted
    };
  }
});

export { queryExtractor };
