import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadJsonData, searchInText } from './642883aa-9e5b-47b8-a162-ecfcefc62062.mjs';
import 'fs';
import 'path';
import 'url';

const generalQuestionsQuery = createTool({
  id: "general-questions-query",
  description: "Queries the general questions knowledge base to find answers to questions about the Pioneers accelerator program",
  inputSchema: z.object({
    query: z.string().describe("The question to search for in the knowledge base")
  }),
  outputSchema: z.object({
    answers: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
        category: z.string()
      })
    ).describe("Matching questions and answers from the knowledge base"),
    found: z.boolean().describe("Whether matching answers were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("general-questions.json");
    const results = [];
    if (data.knowledge_base) {
      for (const [category, items] of Object.entries(
        data.knowledge_base
      )) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.question && item.answer && (searchInText(item.question, query) || searchInText(item.answer, query))) {
              results.push({
                question: item.question,
                answer: item.answer,
                category: category.replace(/_/g, " ")
              });
            }
          }
        }
      }
    }
    return {
      answers: results.slice(0, 5),
      // Limit to top 5 results
      found: results.length > 0
    };
  }
});

export { generalQuestionsQuery };
