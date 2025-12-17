import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { registerApiRoute } from '@mastra/core/server';
import { WebClient } from '@slack/web-api';
import * as crypto from 'crypto';

"use strict";
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

"use strict";
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
    const { mastra } = await Promise.resolve().then(function () { return index; });
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

"use strict";
const lucie = new Agent({
  id: "lucie-agent",
  name: "lucie-agent",
  description: "Lucie is the CEO of the the Pioneer.vc accelerator.",
  instructions: `You are Lucie. You are the CEO of the Pioneer.vc accelerator. You are responsible for the overall direction of the accelerator. You are also responsible for the hiring of the founders. You are also responsible for the fundraising of the founders. You are also responsible for the marketing of the accelerator. You are also responsible for the events of the accelerator. You are also responsible for the community of the accelerator. You are also responsible for the alumni of the accelerator. You are also responsible for the network of the accelerator. You are also responsible for the partnerships of the accelerator. You are also responsible for the investments of the accelerator. You are also responsible for the portfolio of the accelerator.

		When a user asks you a question:
		1. First, use the query-extractor tool to extract and format the user's question
		2. Then, use the orchestrator-sender tool to send the extracted query to the orchestrator-agent for processing
		3. Return the orchestrator-agent's response to the user

		IMPORTANT: Always use both tools in sequence - first extract the query, then send it to the orchestrator.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryExtractor, orchestratorSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
const queryLogger = createTool({
  id: "query-logger",
  description: "Logs the received query and formatted query object to the console for debugging and monitoring",
  inputSchema: z.object({
    query: z.string().describe("The extracted query string"),
    formatted: z.object({
      question: z.string(),
      type: z.string(),
      timestamp: z.string()
    }).describe("The formatted JSON object containing the question")
  }),
  outputSchema: z.object({
    logged: z.boolean().describe("Whether the query was successfully logged")
  }),
  execute: async ({ query, formatted }) => {
    console.log("=".repeat(60));
    console.log("\u{1F4E5} ORCHESTRATOR AGENT - Received Query");
    console.log("=".repeat(60));
    console.log("Query:", query);
    console.log(
      "Formatted Query Object:",
      JSON.stringify(formatted, null, 2)
    );
    console.log("Timestamp:", formatted.timestamp);
    console.log("Question Type:", formatted.type);
    console.log("=".repeat(60));
    return { logged: true };
  }
});

"use strict";
const queryRouter = createTool({
  id: "query-router",
  description: "Routes a query to the appropriate specialized agent based on the question type",
  inputSchema: z.object({
    query: z.string().describe("The query to route to a specialized agent"),
    questionType: z.enum([
      "startups",
      "events",
      "workshops",
      "timeline",
      "founders",
      "guests",
      "general"
    ]).describe(
      "The type of question determining which agent to route to"
    )
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the query was successfully routed"),
    agentName: z.string().describe("The name of the agent that handled the query"),
    response: z.string().describe("The response from the specialized agent")
  }),
  execute: async ({
    query,
    questionType
  }) => {
    const agentMapping = {
      startups: {
        agentName: "startupsAgent",
        displayName: "Startups Agent"
      },
      events: {
        agentName: "eventAgent",
        displayName: "Event Agent"
      },
      workshops: {
        agentName: "workshopsAgent",
        displayName: "Workshops Agent"
      },
      timeline: {
        agentName: "timelineAgent",
        displayName: "Timeline Agent"
      },
      founders: {
        agentName: "startupsAgent",
        // Founders are handled by startups agent
        displayName: "Startups Agent"
      },
      guests: {
        agentName: "eventGuestsAgent",
        displayName: "Event Guests Agent"
      },
      general: {
        agentName: "generalQuestionsAgent",
        displayName: "General Questions Agent"
      }
    };
    const mapping = agentMapping[questionType];
    if (!mapping) {
      throw new Error(
        `No agent mapping found for question type: ${questionType}`
      );
    }
    const { mastra } = await Promise.resolve().then(function () { return index; });
    const specializedAgent = mastra.getAgent(
      mapping.agentName
    );
    if (!specializedAgent) {
      throw new Error(
        `Specialized agent "${mapping.agentName}" not found`
      );
    }
    const message = `Question Type: ${questionType}

Query: ${query}`;
    const response = await specializedAgent.generate(message);
    return {
      success: true,
      agentName: mapping.displayName,
      response: response.text || JSON.stringify(response)
    };
  }
});

"use strict";
const orchestratorAgent = new Agent({
  id: "orchestrator-agent",
  name: "orchestrator-agent",
  description: "Orchestrates the flow of information between the different agents",
  instructions: `You are an orchestrator agent. You are responsible for the flow of information between the different agents.

		When you receive a query from the lucie-agent:
		1. First, use the query-logger tool to log the received query and its formatted object
		2. Extract the questionType from the formatted object
		3. Use the query-router tool to route the query to the appropriate specialized agent based on the questionType
		4. Return the response from the specialized agent

		The questionType can be one of: startups, events, workshops, timeline, founders, guests, or general.
		Always use the query-logger tool first, then use the query-router tool to route the query.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryLogger, queryRouter },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
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

"use strict";
function getProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  let currentDir = dirname(currentFile);
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const dataPath = join(currentDir, "data");
    if (existsSync(join(dataPath, "general-questions.json"))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    attempts++;
  }
  return process.cwd();
}
function loadJsonData(filename) {
  const possiblePaths = [
    // From project root (when running from source)
    join(process.cwd(), "data", filename),
    // From .mastra/output (when running built version)
    join(process.cwd(), "..", "..", "data", filename),
    // From .mastra/output with different structure
    join(process.cwd(), "..", "data", filename),
    // Using project root detection
    join(getProjectRoot(), "data", filename)
  ];
  for (const filePath of possiblePaths) {
    try {
      const fileContent = readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      continue;
    }
  }
  console.error(`Error loading ${filename}: Tried paths:`, possiblePaths);
  throw new Error(
    `Failed to load data file: ${filename}. Checked paths: ${possiblePaths.join(
      ", "
    )}`
  );
}
function searchInText(text, query) {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  return normalizedText.includes(normalizedQuery);
}
function searchInObject(obj, query) {
  if (typeof obj === "string") {
    return searchInText(obj, query);
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => searchInObject(item, query));
  }
  if (obj && typeof obj === "object") {
    return Object.values(obj).some((value) => searchInObject(value, query));
  }
  return false;
}

"use strict";
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

"use strict";
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
    let relevantData = [];
    if (data && typeof data === "object") {
      if (data.answers && Array.isArray(data.answers)) {
        summary = `Found ${data.answers.length} matching answer(s) in the knowledge base.`;
        relevantData = data.answers;
      } else if (data.startups && Array.isArray(data.startups)) {
        summary = `Found ${data.startups.length} matching startup(s).`;
        relevantData = data.startups;
      } else if (data.founders && Array.isArray(data.founders)) {
        summary = `Found ${data.founders.length} matching founder(s).`;
        relevantData = data.founders;
      } else if (data.workshops && Array.isArray(data.workshops)) {
        summary = `Found ${data.workshops.length} matching workshop(s).`;
        relevantData = data.workshops;
      } else if (data.phases && Array.isArray(data.phases)) {
        const phaseCount = data.phases.length;
        const eventCount = data.events?.length || 0;
        summary = `Found ${phaseCount} matching phase(s) and ${eventCount} matching event(s).`;
        relevantData = {
          phases: data.phases,
          events: data.events || []
        };
      } else if (data.events && Array.isArray(data.events)) {
        summary = `Found ${data.events.length} matching event(s).`;
        relevantData = data.events;
      } else if (data.timeline && Array.isArray(data.timeline)) {
        summary = `Found ${data.timeline.length} timeline phase(s).`;
        relevantData = data.timeline;
      } else if (Array.isArray(data)) {
        if (data.length > 0) {
          summary = `Found ${data.length} matching result(s) for the query.`;
          relevantData = data;
        } else {
          summary = "No matching results found for the query.";
          relevantData = [];
        }
      } else {
        summary = "Retrieved data from the knowledge base.";
        relevantData = data;
      }
    } else if (Array.isArray(data)) {
      if (data.length > 0) {
        summary = `Found ${data.length} matching result(s) for the query.`;
        relevantData = data;
      } else {
        summary = "No matching results found for the query.";
        relevantData = [];
      }
    } else {
      summary = "Data retrieved successfully.";
      relevantData = data || [];
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

"use strict";
const responseSender = createTool({
  id: "response-sender",
  description: "Sends formatted data to the response-generator-agent for final response generation",
  inputSchema: z.object({
    formatted: z.object({
      query: z.string(),
      questionType: z.string(),
      agentName: z.string(),
      summary: z.string(),
      relevantData: z.any(),
      timestamp: z.string()
    }).describe("The formatted data to send to the response generator")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the data was successfully sent"),
    response: z.string().describe(
      "The generated response from the response-generator-agent"
    )
  }),
  execute: async ({
    formatted
  }) => {
    const { mastra } = await Promise.resolve().then(function () { return index; });
    const responseGeneratorAgent = mastra.getAgent(
      "responseGeneratorAgent"
    );
    if (!responseGeneratorAgent) {
      throw new Error("Response generator agent not found");
    }
    const message = `You have received formatted data from a specialized agent.

First, extract the formatted data from this message and use the formatted-data-receiver tool to log it.

Formatted Data JSON:
${JSON.stringify(formatted, null, 2)}

After logging, generate a clear, helpful, and comprehensive response to the user's query using the relevant data provided.`;
    const response = await responseGeneratorAgent.generate(message);
    return {
      success: true,
      response: response.text || JSON.stringify(response)
    };
  }
});

"use strict";
const generalQuestionsAgent = new Agent({
  id: "general-questions-agent",
  name: "general-questions-agent",
  description: "General Questions Agent is responsible for answering general questions",
  instructions: `You are a general questions agent. You are responsible for answering general questions about the Pioneers accelerator program.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="General Questions Agent"
3. Use the general-questions-query tool with: query={extracted query} to search the knowledge base
4. IMPORTANT: The general-questions-query tool returns an object with "answers" and "found" keys. Pass the ENTIRE result object (not just the answers array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from general-questions-query}, agentName="General Questions Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 general-questions-query \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    queryReceiver,
    generalQuestionsQuery,
    dataFormatter,
    responseSender
  },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
const guestsQuery = createTool({
  id: "guests-query",
  description: "Queries the special events with guests database to find information about guest speakers and their events",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant guest events")
  }),
  outputSchema: z.object({
    events: z.array(z.any()).describe("Matching guest events from the database"),
    found: z.boolean().describe("Whether matching guest events were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("special-events-with-guests.json");
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

"use strict";
const eventGuestsAgent = new Agent({
  id: "event-guests-agent",
  name: "event-guests-agent",
  description: "Event Guests Agent is responsible for managing event guests",
  instructions: `You are an event guests agent. You are responsible for managing event guests and special guest events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Guests Agent"
3. Use the guests-query tool with: query={extracted query} to search for guest event information
4. IMPORTANT: The guests-query tool returns an object with "events" and "found" keys. Pass the ENTIRE result object (not just the events array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from guests-query}, agentName="Event Guests Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 guests-query \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, guestsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
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

"use strict";
const eventAgent = new Agent({
  id: "event-agent",
  name: "event-agent",
  description: "Event Agent is responsible for managing events",
  instructions: `You are an event agent. You are responsible for managing events in the Pioneers accelerator.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Event Agent"
3. Use the events-query tool with: query={extracted query} to search for event information
4. IMPORTANT: The events-query tool returns an object with "events" and "found" keys. Pass the ENTIRE result object (not just the events array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from events-query}, agentName="Event Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 events-query \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, eventsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
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

"use strict";
const foundersQuery = createTool({
  id: "founders-query",
  description: "Queries the founders database to find information about founders in the accelerator",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant founders")
  }),
  outputSchema: z.object({
    founders: z.array(z.any()).describe("Matching founders from the database"),
    found: z.boolean().describe("Whether matching founders were found")
  }),
  execute: async ({ query }) => {
    const data = loadJsonData("founders.json");
    const results = [];
    if (data.founders && Array.isArray(data.founders)) {
      for (const founder of data.founders) {
        if (searchInObject(founder, query)) {
          results.push(founder);
        }
      }
    }
    return {
      founders: results.slice(0, 10),
      // Limit to top 10 results
      found: results.length > 0
    };
  }
});

"use strict";
const startupsAgent = new Agent({
  id: "startups-agent",
  name: "startups-agent",
  description: "Startups Agent is responsible for the startups of the Pioneer.vc accelerator.",
  instructions: `You are a startups agent. You are responsible for the startups of the Pioneer.vc accelerator. You handle questions about startups, companies, founders, funding, and the portfolio.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Startups Agent"
3. If the questionType is "startups", use the startups-query tool with: query={extracted query}
   If the questionType is "founders", use the founders-query tool with: query={extracted query}
4. IMPORTANT: The query tools return objects with "startups"/"founders" and "found" keys. Pass the ENTIRE result object (not just the array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from the query tool}, agentName="Startups Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 (startups-query or founders-query) \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    queryReceiver,
    startupsQuery,
    foundersQuery,
    dataFormatter,
    responseSender
  },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
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

"use strict";
const timelineAgent = new Agent({
  id: "timeline-agent",
  name: "timeline-agent",
  description: "Timeline Agent is responsible for the timeline of the Pioneer.vc accelerator.",
  instructions: `You are a timeline agent. You are responsible for the timeline of the Pioneer.vc accelerator. You handle questions about program phases, milestones, events, and schedules.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Timeline Agent"
3. Use the timeline-query tool with: query={extracted query} to search for timeline information
4. IMPORTANT: The timeline-query tool returns an object with "phases", "events", and "found" keys. Pass the ENTIRE result object (not just the arrays) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from timeline-query}, agentName="Timeline Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 timeline-query \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, timelineQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
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

"use strict";
const workshopsAgent = new Agent({
  id: "workshops-agent",
  name: "workshops-agent",
  description: "Workshops Agent is responsible for the workshops of the Pioneer.vc accelerator.",
  instructions: `You are a workshops agent. You are responsible for the workshops of the Pioneer.vc accelerator. You handle questions about workshops, training sessions, and learning activities.

When you receive a query from the orchestrator, the message will be in the format:
"Question Type: {questionType}

Query: {query}"

1. First, extract the questionType and query from the message
2. Use the query-receiver tool with: query={extracted query}, questionType={extracted questionType}, agentName="Workshops Agent"
3. Use the workshops-query tool with: query={extracted query} to search for workshop information
4. IMPORTANT: The workshops-query tool returns an object with "workshops" and "found" keys. Pass the ENTIRE result object (not just the workshops array) to the data-formatter tool.
5. Use the data-formatter tool with: query={extracted query}, questionType={extracted questionType}, data={the ENTIRE result object from workshops-query}, agentName="Workshops Agent"
6. Use the response-sender tool with: formatted={the formatted object from data-formatter} to send the formatted data to the response-generator-agent

Always follow this sequence: query-receiver \u2192 workshops-query \u2192 data-formatter \u2192 response-sender.
Always pass the complete result object from the query tool to the data-formatter, not just a portion of it.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { queryReceiver, workshopsQuery, dataFormatter, responseSender },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
const formattedDataReceiver = createTool({
  id: "formatted-data-receiver",
  description: "Receives and logs formatted data from specialized agents before generating the final response",
  inputSchema: z.object({
    formatted: z.object({
      query: z.string(),
      questionType: z.string(),
      agentName: z.string(),
      summary: z.string(),
      relevantData: z.any(),
      timestamp: z.string()
    }).describe("The formatted data received from a specialized agent")
  }),
  outputSchema: z.object({
    logged: z.boolean().describe("Whether the formatted data was successfully logged")
  }),
  execute: async ({ formatted }) => {
    console.log("=".repeat(60));
    console.log("\u{1F4EC} RESPONSE GENERATOR AGENT - Received Formatted Data");
    console.log("=".repeat(60));
    console.log("Original Query:", formatted.query);
    console.log("Question Type:", formatted.questionType);
    console.log("Data Source:", formatted.agentName);
    console.log("Summary:", formatted.summary);
    console.log("Received at:", formatted.timestamp);
    console.log(
      "Relevant Data:",
      JSON.stringify(formatted.relevantData, null, 2)
    );
    console.log("=".repeat(60));
    return { logged: true };
  }
});

"use strict";
const responseGeneratorAgent = new Agent({
  id: "response-generator-agent",
  name: "response-generator-agent",
  description: "Response Generator Agent is responsible for generating responses",
  instructions: `You are a response generator agent. You are responsible for generating final responses to user questions.

When you receive a message with formatted data from a specialized agent, the message will contain a JSON object in the "Formatted Data JSON:" section with:
- query: The original user query
- questionType: The type of question
- agentName: The name of the agent that retrieved the data
- summary: A summary of the retrieved data
- relevantData: The actual data retrieved from the JSON files
- timestamp: When the data was formatted

1. First, extract the JSON object from the "Formatted Data JSON:" section of the message
2. Parse the JSON to get the formatted data object
3. Use the formatted-data-receiver tool with the parsed formatted data object
4. Then, generate a clear, helpful, and comprehensive response to the user's query based on the relevantData provided

Always use the formatted-data-receiver tool first to log the data, then generate your response using the relevantData.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: { formattedDataReceiver },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
function verifySlackRequest(signingSecret, requestSignature, timestamp, body) {
  const fiveMinutesAgo = Math.floor(Date.now() / 1e3) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBasestring, "utf8").digest("hex");
  if (typeof requestSignature !== "string" || Buffer.byteLength(requestSignature, "utf8") !== Buffer.byteLength(mySignature, "utf8")) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(mySignature, "utf8"), Buffer.from(requestSignature, "utf8"));
}

"use strict";
const SPINNER = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
const TOOL_ICONS = ["\u{1F504}", "\u2699\uFE0F", "\u{1F527}", "\u26A1"];
const WORKFLOW_ICONS = ["\u{1F4CB}", "\u26A1", "\u{1F504}", "\u2728"];
const ANIMATION_INTERVAL = 300;
const TOOL_DISPLAY_DELAY = 300;
const STEP_DISPLAY_DELAY = 300;

"use strict";
function formatChunkType(type) {
  return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function getStatusText(state, frame) {
  const spinner = SPINNER[frame % SPINNER.length];
  const toolIcon = TOOL_ICONS[frame % TOOL_ICONS.length];
  const workflowIcon = WORKFLOW_ICONS[frame % WORKFLOW_ICONS.length];
  const type = state.chunkType;
  const label = formatChunkType(type);
  if (type.startsWith("tool-") && state.toolName) {
    return `${toolIcon} ${label}: ${state.toolName}...`;
  }
  if (type.startsWith("workflow-") && state.stepName) {
    return `${workflowIcon} ${label}: ${state.stepName}...`;
  }
  if (type.includes("agent") && state.agentName) {
    return `${spinner} ${label}: ${state.agentName}...`;
  }
  return `${spinner} ${label}...`;
}

"use strict";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const formatName = (id) => id.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

"use strict";
async function streamToSlack(options) {
  const { mastra, slackClient, channel, threadTs, agentName, message, resourceId, threadId } = options;
  const state = { text: "", chunkType: "start" };
  let messageTs;
  let frame = 0;
  let animationTimer;
  let isFinished = false;
  const stopAnimation = () => {
    isFinished = true;
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = void 0;
    }
  };
  const updateSlack = async (text) => {
    if (!messageTs || isFinished) return;
    try {
      await slackClient.chat.update({
        channel,
        ts: messageTs,
        text: text ?? getStatusText(state, frame)
      });
    } catch {
    }
  };
  const sendFinalMessage = async (text) => {
    await retrySlackUpdate(slackClient, channel, messageTs, text);
  };
  try {
    const initial = await slackClient.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: getStatusText(state, 0)
    });
    messageTs = initial.ts;
    animationTimer = setInterval(() => {
      if (!isFinished) {
        frame++;
        updateSlack();
      }
    }, ANIMATION_INTERVAL);
    const agent = mastra.getAgent(agentName);
    if (!agent) throw new Error(`Agent "${agentName}" not found`);
    const stream = await agent.stream(message, {
      resourceId,
      threadId
    });
    for await (const chunk of stream.fullStream) {
      state.chunkType = chunk.type;
      switch (chunk.type) {
        case "text-delta":
          if (chunk.payload.text) {
            state.text += chunk.payload.text;
          }
          break;
        case "tool-call":
          state.toolName = formatName(chunk.payload.toolName);
          frame++;
          await updateSlack();
          await sleep(TOOL_DISPLAY_DELAY);
          break;
        case "tool-output":
          if (chunk.payload.output && typeof chunk.payload.output === "object") {
            const output = chunk.payload.output;
            if (output.type) {
              state.chunkType = output.type;
            }
            if (output.type === "workflow-step-start") {
              state.stepName = formatName(output.payload?.id || output.payload?.stepId || "step");
              frame++;
              await updateSlack();
              await sleep(STEP_DISPLAY_DELAY);
            }
          }
          break;
        case "workflow-execution-start":
          state.workflowName = formatName(chunk.payload.name || chunk.payload.workflowId);
          state.stepName = "Starting";
          break;
      }
    }
    stopAnimation();
    await sendFinalMessage(state.text || "Sorry, I couldn't generate a response.");
    console.log("\u2705 Response sent to Slack");
  } catch (error) {
    console.error("\u274C Error streaming to Slack:", error);
    stopAnimation();
    const errorText = `\u274C Error: ${error instanceof Error ? error.message : String(error)}`;
    if (messageTs) {
      await sendFinalMessage(errorText);
    } else {
      await slackClient.chat.postMessage({ channel, thread_ts: threadTs, text: errorText }).catch(() => {
      });
    }
    throw error;
  }
}
async function retrySlackUpdate(client, channel, ts, text, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await client.chat.update({ channel, ts, text });
      return;
    } catch (err) {
      console.error(`\u274C Final message attempt ${attempt + 1} failed:`, err);
      if (attempt < maxAttempts - 1) await sleep(500);
    }
  }
  console.error(`\u274C Failed to send final message after ${maxAttempts} attempts`);
}

"use strict";
function createSlackEventsRoute(config) {
  return registerApiRoute(`/slack/${config.name}/events`, {
    method: "POST",
    handler: async (c) => {
      try {
        const body = await c.req.text();
        const payload = JSON.parse(body);
        if (payload.type === "url_verification") {
          console.log(
            `\u2705 [${config.name}] URL verification challenge received`
          );
          return c.json({ challenge: payload.challenge });
        }
        if (!config.botToken || !config.signingSecret) {
          console.error(
            `\u274C [${config.name}] Missing bot token or signing secret`
          );
          return c.json({ error: "Server misconfigured" }, 500);
        }
        const slackSignature = c.req.header("x-slack-signature");
        const slackTimestamp = c.req.header(
          "x-slack-request-timestamp"
        );
        if (!slackSignature || !slackTimestamp) {
          return c.json(
            { error: "Missing Slack signature headers" },
            401
          );
        }
        const isValid = verifySlackRequest(
          config.signingSecret,
          slackSignature,
          slackTimestamp,
          body
        );
        if (!isValid) {
          console.error(
            `\u274C [${config.name}] Invalid Slack signature`
          );
          return c.json({ error: "Invalid signature" }, 401);
        }
        if (payload.event) {
          const event = payload.event;
          if (event.bot_id || event.subtype) {
            return c.json({ ok: true });
          }
          if (event.type === "app_mention" || event.type === "message") {
            let messageText = event.text || "";
            const userId = event.user;
            const channelId = event.channel;
            const threadTs = event.thread_ts || event.ts;
            const teamId = payload.team_id;
            console.log(`\u{1F4E8} [${config.name}] Message received:`, {
              agent: config.agentName,
              text: messageText,
              user: userId
            });
            messageText = messageText.replace(/<@[A-Z0-9]+>/g, "").trim();
            const mastra = c.get("mastra");
            const slackClient = new WebClient(config.botToken);
            (async () => {
              try {
                await streamToSlack({
                  mastra,
                  slackClient,
                  channel: channelId,
                  threadTs,
                  agentName: config.agentName,
                  message: messageText,
                  resourceId: `slack-${teamId}-${userId}`,
                  threadId: `slack-${channelId}-${threadTs}`
                });
              } catch (error) {
                console.error(
                  `\u274C [${config.name}] Error processing message:`,
                  error
                );
              }
            })();
          }
        }
        return c.json({ ok: true });
      } catch (error) {
        console.error(
          `Error handling Slack event [${config.name}]:`,
          error
        );
        return c.json({ error: "Failed to handle event" }, 500);
      }
    }
  });
}
const slackApps = [
  {
    name: "lucie",
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    agentName: "lucie"
  }
];
const slackRoutes = slackApps.map(createSlackEventsRoute);

"use strict";
const mastra = new Mastra({
  // Registered agents - keys must match agentName in slack/routes.ts
  agents: {
    lucie,
    orchestratorAgent,
    generalQuestionsAgent,
    eventGuestsAgent,
    eventAgent,
    startupsAgent,
    timelineAgent,
    workshopsAgent,
    responseGeneratorAgent
  },
  // Registered workflows - available to agents via their workflows config
  workflows: {},
  // Local SQLite storage for conversation memory and agent state
  storage: new LibSQLStore({
    id: "mastra",
    url: "file:./mastra.db"
  }),
  // API server configuration with Slack webhook routes
  server: {
    apiRoutes: slackRoutes
  },
  // Bundler configuration to prevent module resolution issues
  bundler: {
    externals: ["supports-color"]
  }
});

var index = /*#__PURE__*/Object.freeze({
	__proto__: null,
	mastra: mastra
});

export { mastra };
