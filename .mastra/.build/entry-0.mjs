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
    questionType: z.enum(["startups", "founders", "pioneers", "sessions", "general"]).describe("The type of question based on data categories"),
    formatted: z.object({
      question: z.string(),
      type: z.string(),
      timestamp: z.string()
    }).describe("The formatted JSON object containing the question")
  }),
  execute: async ({ message: userMessage }) => {
    const cleanedMessage = userMessage.trim().replace(/\s+/g, " ");
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
      pioneers: [
        /pioneer/i,
        /pioneers/i,
        /profile book/i,
        /pioneer profile/i,
        /pioneer profiles/i,
        /pioneer book/i,
        /founder/i,
        /founders/i,
        /entrepreneur/i,
        /entrepreneurs/i,
        /ceo/i,
        /cto/i,
        /cofounder/i,
        /co-founder/i,
        /co-founders/i,
        /team/i,
        /background/i,
        /experience/i,
        /skills/i,
        /background/i,
        /experience/i,
        /skills/i,
        /background/i,
        /experience/i,
        /skills/i
      ],
      sessions: [
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
        /ama/i,
        /session/i,
        /sessions/i,
        /event grid/i,
        /session grid/i,
        /schedule/i,
        /program week/i,
        /week \d+/i,
        /masterclass/i,
        /group exercise/i,
        /office hours/i,
        /pitch day/i,
        /friday pitch/i
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
function message(message2) {
  console.log("\x1B[32m%s\x1B[0m", message2);
}
function log(message2, data) {
  console.log("\x1B[33m%s\x1B[0m", message2, data);
}
function error(message2, data) {
  console.log("\x1B[31m%s\x1B[0m", message2, data);
}

"use strict";
const specializedAgentRouter = createTool({
  id: "specialized-agent-router",
  description: "Routes a query directly to the appropriate specialized agent based on the question type",
  inputSchema: z.object({
    query: z.string().describe("The user query to route to a specialized agent"),
    questionType: z.enum([
      "startups",
      "events",
      "founders",
      "pioneers",
      "sessions",
      "general"
    ]).describe(
      "The type of question determining which agent to route to"
    ),
    threadId: z.string().optional().describe("Thread ID for maintaining conversation context"),
    resourceId: z.string().optional().describe("Resource ID for maintaining conversation context")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the query was successfully routed"),
    agentName: z.string().describe("The name of the agent that handled the query"),
    response: z.string().describe("The response from the specialized agent")
  }),
  execute: async ({
    query,
    questionType,
    threadId: inputThreadId,
    resourceId: inputResourceId
  }, context) => {
    const threadId = inputThreadId || (context && "threadId" in context ? context.threadId : void 0);
    const resourceId = inputResourceId || (context && "resourceId" in context ? context.resourceId : void 0);
    message(
      "\u{1F3AF} SPECIALIZED AGENT ROUTER - Routing query directly to specialized agent"
    );
    log("Question type:", questionType);
    log("Query:", query);
    const agentMapping = {
      events: {
        agentName: "sessionEventGridAgent",
        displayName: "Calendar Agent"
      },
      pioneers: {
        agentName: "pioneerProfileBookAgent",
        displayName: "Pioneer Profile Book Agent"
      },
      sessions: {
        agentName: "sessionEventGridAgent",
        displayName: "Session Event Grid Agent"
      },
      general: {
        agentName: "generalQuestionsAgent",
        displayName: "General Questions Agent"
      }
    };
    const mapping = agentMapping[questionType];
    if (!mapping) {
      error("No agent mapping found for question type:", questionType);
      throw new Error(
        `No agent mapping found for question type: ${questionType}`
      );
    }
    const { mastra } = await Promise.resolve().then(function () { return index; });
    const specializedAgent = mastra.getAgent(
      mapping.agentName
    );
    if (!specializedAgent) {
      error(
        `Specialized agent "${mapping.agentName}" not found`,
        mapping
      );
      throw new Error(
        `Specialized agent "${mapping.agentName}" not found`
      );
    }
    message(`\u{1F3AF} SPECIALIZED AGENT ROUTER - Calling ${mapping.displayName}`);
    log("Query sent:", query);
    if (threadId || resourceId) {
      log("Thread context:", { threadId, resourceId });
    }
    const generateOptions = {};
    if (threadId) generateOptions.threadId = threadId;
    if (resourceId) generateOptions.resourceId = resourceId;
    const response = await specializedAgent.generate(
      query,
      Object.keys(generateOptions).length > 0 ? generateOptions : void 0
    );
    const responseText = response.text || JSON.stringify(response);
    message(
      `\u2705 SPECIALIZED AGENT ROUTER - Received response from ${mapping.displayName}`
    );
    return {
      success: true,
      agentName: mapping.displayName,
      response: responseText
    };
  }
});

"use strict";
const lucie = new Agent({
  id: "lucie-agent",
  name: "lucie-agent",
  description: "Lucie is the Pioneer.vc accelerator agent.",
  instructions: `You are Lucie, the primary Pioneer.vc accelerator agent for Pioneer.vc.

Your job is NOT to answer questions directly from your own knowledge. Instead, you:
1. Use the query-extractor tool to extract and classify the user's question from their latest message
2. Use the specialized-agent-router tool to route the query directly to the appropriate specialized agent
3. Return the specialized agent's response to the user

When calling tools:
- Always pass ONLY the user's latest natural-language question as the "message" input to query-extractor
- After receiving { query, questionType, formatted } from query-extractor, call specialized-agent-router with:
  - "query": the user's question WITH relevant conversation context if needed for follow-up questions
  - "questionType": the questionType returned by query-extractor
- If the user's question is a follow-up (references "the first", "those", "them", "it", etc.), include brief context from your previous response in the query
- Example: If user asks "Tell me about the first two" after you listed startups, pass "Tell me about the first two startups I just mentioned (PulseMind and AgroLoop)" to the router

After calling specialized-agent-router:
- Take the "response" field from the specialized-agent-router tool output
- This response already contains the complete answer from the specialized agent
- Return this response directly to the user as your final answer
- Do NOT modify, summarize, or add commentary to the response unless it's clearly incomplete or needs clarification
- Always keep a friendly and engaging tone in your response
- Always use the same language as the user's message for your response
- Do NOT add extra explanations, meta commentary, or restatements around it unless the response is clearly incomplete

If a user's message is not a question or cannot be classified, still run query-extractor and let the pipeline handle it.
Keep your responses clear and concise, and always reflect exactly what comes back from the specialized agents.`,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    queryExtractor,
    specializedAgentRouter
  },
  memory: new Memory({
    options: {
      lastMessages: 20
    }
  })
});

"use strict";
const dataCache = /* @__PURE__ */ new Map();
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
  if (dataCache.has(filename)) {
    return dataCache.get(filename);
  }
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
      const data = JSON.parse(fileContent);
      dataCache.set(filename, data);
      return data;
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
function clearDataCache() {
  dataCache.clear();
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
    message("\u{1F50E} GENERAL QUESTIONS QUERY - Searching knowledge base");
    log("Query:", query);
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
    const finalResults = results.slice(0, 5);
    message(
      `\u2705 GENERAL QUESTIONS QUERY - Found ${finalResults.length} result(s)`
    );
    log(
      "Results:",
      finalResults.length > 0 ? `${finalResults.length} answer(s) found` : "No answers found"
    );
    return {
      answers: finalResults,
      found: results.length > 0
    };
  }
});

"use strict";
const generalQuestionsAgent = new Agent({
  id: "general-questions-agent",
  name: "general-questions-agent",
  description: "General Questions Agent is responsible for answering general questions",
  instructions: `You are a general questions agent for the Pioneer.vc accelerator program. You handle general questions about the program that don't fit into specific categories like events, startups, or founders.

When you receive a query:
1. Use the general-questions-query tool with the user's question to search the knowledge base
2. The tool returns an object with "answers" (array of matching Q&A pairs), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If answers are found, provide detailed information from the data
- When users ask for specific data (lists, facts, fields), extract and display the exact information
- If no answers are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the general-questions-query tool.`,
  model: "anthropic/claude-3-5-haiku-20241022",
  tools: {
    generalQuestionsQuery
  },
  memory: new Memory({
    options: {
      lastMessages: 10
    }
  })
});

"use strict";
const pioneerProfileBookQuery = createTool({
  id: "pioneer-profile-book-query",
  description: "Queries the pioneer profile book database to find information about pioneers in the accelerator. Handles general searches, specific field queries (skills, industries, roles, etc.), matching queries (co-founder matching), and aggregate queries (count, totals, etc.)",
  inputSchema: z.object({
    query: z.string().describe(
      "The search query to find relevant pioneers or answer questions about them"
    )
  }),
  outputSchema: z.object({
    pioneers: z.array(z.any()).describe("Matching pioneers from the database"),
    found: z.boolean().describe("Whether matching pioneers were found"),
    metadata: z.object({
      queryType: z.enum([
        "aggregate",
        "specific_field",
        "matching",
        "general",
        "all"
      ]).optional().describe("Type of query detected"),
      totalCount: z.number().optional().describe("Total number of pioneers"),
      filterField: z.string().optional().describe(
        "Field filter applied (skills, industries, roles, etc.)"
      )
    }).optional().describe("Additional metadata about the query results")
  }),
  execute: async ({ query }) => {
    message("\u{1F50E} PIONEER PROFILE BOOK QUERY - Searching pioneers database");
    log("Query:", query);
    const data = loadJsonData("pioneers_profile_book_su2025.json");
    const allPioneers = Array.isArray(data) ? data : [];
    const queryLower = query.toLowerCase();
    const isAggregateQuery = queryLower.includes("how many") || queryLower.includes("count") || queryLower.includes("total") || queryLower.includes("number of") || queryLower.includes("pioneers are");
    const isAllPioneersQuery = queryLower.includes("all pioneer") || queryLower.includes("list of pioneer") || queryLower.includes("every pioneer") || queryLower.includes("all the pioneer") || queryLower === "pioneers" || queryLower === "pioneer" || queryLower.includes("what pioneers") || queryLower.includes("show me pioneers") || queryLower.includes("profile book");
    const isMatchingQuery = queryLower.includes("match") || queryLower.includes("find me a") || queryLower.includes("looking for") || queryLower.includes("seeking") || queryLower.includes("available") || queryLower.includes("co-founder") || queryLower.includes("cofounder") || queryLower.includes("who can") || queryLower.includes("who has");
    const isSpecificFieldQuery = queryLower.includes("skill") || queryLower.includes("tech") || queryLower.includes("industry") || queryLower.includes("role") || queryLower.includes("experience") || queryLower.includes("years of") || queryLower.includes("nationality") || queryLower.includes("education") || queryLower.includes("company") || queryLower.includes("linkedin") || queryLower.includes("track record");
    let results = [];
    let metadata;
    if (allPioneers.length === 0) {
      message(
        "\u26A0\uFE0F PIONEER PROFILE BOOK QUERY - No pioneers found in database"
      );
      return {
        pioneers: [],
        found: false
      };
    }
    if (isAggregateQuery) {
      message(
        "\u{1F4CA} PIONEER PROFILE BOOK QUERY - Detected aggregate query, returning all pioneers"
      );
      results = [...allPioneers];
      metadata = {
        queryType: "aggregate",
        totalCount: allPioneers.length
      };
    } else if (isAllPioneersQuery) {
      message("\u{1F4CB} PIONEER PROFILE BOOK QUERY - Returning all pioneers");
      results = [...allPioneers];
      metadata = {
        queryType: "all",
        totalCount: allPioneers.length
      };
    } else if (isMatchingQuery) {
      message("\u{1F3AF} PIONEER PROFILE BOOK QUERY - Detected matching query");
      const searchTerms = queryLower.replace(
        /find me a|looking for|seeking|who can|who has|match|available/gi,
        ""
      ).trim().split(/\s+/).filter((term) => term.length > 2);
      if (queryLower.includes("skill") || queryLower.includes("tech") || queryLower.includes("developer") || queryLower.includes("engineer")) {
        for (const pioneer of allPioneers) {
          const techSkills = pioneer["Tech Skills"] || "";
          const skillsStr = Array.isArray(techSkills) ? techSkills.join(" ").toLowerCase() : techSkills.toLowerCase();
          if (searchTerms.some((term) => skillsStr.includes(term)) || searchInText(skillsStr, query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "matching",
          filterField: "Tech Skills"
        };
      } else if (queryLower.includes("role") || queryLower.includes("cto") || queryLower.includes("ceo") || queryLower.includes("product") || queryLower.includes("sales")) {
        for (const pioneer of allPioneers) {
          const roles = pioneer["Roles I could take"] || "";
          const rolesStr = Array.isArray(roles) ? roles.join(" ").toLowerCase() : roles.toLowerCase();
          if (searchTerms.some((term) => rolesStr.includes(term)) || searchInText(rolesStr, query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "matching",
          filterField: "Roles I could take"
        };
      } else if (queryLower.includes("industry")) {
        for (const pioneer of allPioneers) {
          const industries = pioneer["Industries"] || "";
          const industriesStr = Array.isArray(industries) ? industries.join(" ").toLowerCase() : industries.toLowerCase();
          if (searchTerms.some(
            (term) => industriesStr.includes(term)
          ) || searchInText(industriesStr, query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "matching",
          filterField: "Industries"
        };
      } else {
        for (const pioneer of allPioneers) {
          if (searchInObject(pioneer["Tech Skills"], query) || searchInObject(pioneer["Roles I could take"], query) || searchInObject(pioneer["Industries"], query) || searchInText(pioneer["Introduction:"] || "", query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "matching"
        };
      }
    } else if (isSpecificFieldQuery) {
      message(
        "\u{1F3AF} PIONEER PROFILE BOOK QUERY - Detected specific field query"
      );
      let matchedPioneers = [];
      for (const pioneer of allPioneers) {
        const nameLower = (pioneer["Name"] || "").toLowerCase();
        if (queryLower.includes(nameLower) || searchInText(queryLower, nameLower)) {
          matchedPioneers.push(pioneer);
        }
      }
      if (matchedPioneers.length > 0) {
        results = matchedPioneers;
        metadata = {
          queryType: "specific_field"
        };
      } else {
        for (const pioneer of allPioneers) {
          if (searchInObject(pioneer, query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "specific_field",
          totalCount: results.length
        };
      }
    } else {
      message(
        "\u{1F50D} PIONEER PROFILE BOOK QUERY - Performing general search"
      );
      let nameMatches = [];
      for (const pioneer of allPioneers) {
        const nameLower = (pioneer["Name"] || "").toLowerCase();
        if (queryLower.includes(nameLower) || nameLower.includes(queryLower)) {
          nameMatches.push(pioneer);
        }
      }
      if (nameMatches.length > 0) {
        results = nameMatches;
        metadata = {
          queryType: "general"
        };
      } else {
        for (const pioneer of allPioneers) {
          if (searchInObject(pioneer, query)) {
            results.push(pioneer);
          }
        }
        metadata = {
          queryType: "general"
        };
      }
    }
    const finalResults = results.slice(0, 50);
    message(
      `\u2705 PIONEER PROFILE BOOK QUERY - Found ${finalResults.length} result(s)`
    );
    log(
      "Results:",
      finalResults.length > 0 ? `${finalResults.length} pioneer(s) found` : "No pioneers found"
    );
    if (metadata) {
      log("Query type:", metadata.queryType);
      if (metadata.totalCount !== void 0) {
        log("Total count:", metadata.totalCount);
      }
      if (metadata.filterField) {
        log("Filter field:", metadata.filterField);
      }
    }
    return {
      pioneers: finalResults,
      found: results.length > 0,
      metadata
    };
  }
});

"use strict";
const pioneerProfileBookAgent = new Agent({
  id: "pioneer-profile-book-agent",
  name: "pioneer-profile-book-agent",
  description: "Pioneer Profile Book Agent is responsible for answering questions about pioneers and their profiles in the Pioneer.vc accelerator",
  instructions: `You are a pioneer profile book agent for the Pioneer.vc accelerator program. You handle questions about pioneers, their profiles, skills, experience, backgrounds, industries, roles, and track records. You handle questions about pioneer names, LinkedIn profiles, introductions, companies worked for, education, industries, years of experience, tech skills, roles they could take, track records, and nationality.

When you receive a query:
1. Use the pioneer-profile-book-query tool with the user's question to search for pioneer information
2. The tool returns an object with "pioneers" (array of matching pioneers), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If pioneers are found, provide detailed information from the data
- When users ask for specific data (lists, names, fields), extract and display the exact information
- If no pioneers are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough

Do NOT call any other tools or agents - generate your final response directly after using the pioneer-profile-book-query tool.`,
  model: "anthropic/claude-3-5-haiku-20241022",
  tools: {
    pioneerProfileBookQuery
  },
  memory: new Memory({
    options: {
      lastMessages: 10
    }
  })
});

"use strict";
const sessionEventGridQuery = createTool({
  id: "session-event-grid-query",
  description: "Queries the session event grid database to find information about sessions, events, and activities in the accelerator. Handles general searches, specific field queries (date, speaker, type, week, participants, etc.), and aggregate queries (count, totals, etc.)",
  inputSchema: z.object({
    query: z.string().describe(
      "The search query to find relevant sessions or answer questions about them"
    )
  }),
  outputSchema: z.object({
    sessions: z.array(z.any()).describe("Matching sessions from the database"),
    found: z.boolean().describe("Whether matching sessions were found"),
    metadata: z.object({
      queryType: z.enum([
        "aggregate",
        "specific_field",
        "participant",
        "general",
        "all"
      ]).optional().describe("Type of query detected"),
      totalCount: z.number().optional().describe("Total number of sessions"),
      filterField: z.string().optional().describe(
        "Field filter applied (date, speaker, type, week, etc.)"
      )
    }).optional().describe("Additional metadata about the query results")
  }),
  execute: async ({ query }) => {
    message("\u{1F50E} SESSION EVENT GRID QUERY - Searching sessions database");
    log("Query:", query);
    const data = loadJsonData("session_event_grid_view.json");
    const allSessions = Array.isArray(data) ? data : [];
    const queryLower = query.toLowerCase();
    const isAggregateQuery = queryLower.includes("how many") || queryLower.includes("count") || queryLower.includes("total") || queryLower.includes("number of") || queryLower.includes("sessions are");
    const isAllSessionsQuery = queryLower.includes("all session") || queryLower.includes("list of session") || queryLower.includes("every session") || queryLower.includes("all the session") || queryLower === "sessions" || queryLower === "session" || queryLower.includes("what sessions") || queryLower.includes("show me sessions") || queryLower.includes("event grid");
    const isParticipantQuery = queryLower.includes("who attended") || queryLower.includes("who participated") || queryLower.includes("participants") || queryLower.includes("who was at") || queryLower.includes("who went to") || queryLower.includes("attended by");
    const isSpecificFieldQuery = queryLower.includes("date") || queryLower.includes("when") || queryLower.includes("time") || queryLower.includes("speaker") || queryLower.includes("week") || queryLower.includes("type of session") || queryLower.includes("session type") || queryLower.includes("masterclass") || queryLower.includes("group exercise") || queryLower.includes("office hours") || queryLower.includes("pitch") || queryLower.includes("friday") || queryLower.includes("instruction") || queryLower.includes("slack") || queryLower.includes("notes") || queryLower.includes("feedback");
    let results = [];
    let metadata;
    if (allSessions.length === 0) {
      message(
        "\u26A0\uFE0F SESSION EVENT GRID QUERY - No sessions found in database"
      );
      return {
        sessions: [],
        found: false
      };
    }
    if (isAggregateQuery) {
      message(
        "\u{1F4CA} SESSION EVENT GRID QUERY - Detected aggregate query, returning all sessions"
      );
      results = [...allSessions];
      metadata = {
        queryType: "aggregate",
        totalCount: allSessions.length
      };
    } else if (isAllSessionsQuery) {
      message("\u{1F4CB} SESSION EVENT GRID QUERY - Returning all sessions");
      results = [...allSessions];
      metadata = {
        queryType: "all",
        totalCount: allSessions.length
      };
    } else if (isParticipantQuery) {
      message("\u{1F465} SESSION EVENT GRID QUERY - Detected participant query");
      for (const session of allSessions) {
        const participants = session["Participants"] || "";
        const nameFromLinked = session["Name (from linked)"] || "";
        const participantsStr = (participants + " " + nameFromLinked).toLowerCase();
        if (searchInText(participantsStr, query)) {
          results.push(session);
        }
      }
      metadata = {
        queryType: "participant",
        filterField: "Participants"
      };
    } else if (isSpecificFieldQuery) {
      message(
        "\u{1F3AF} SESSION EVENT GRID QUERY - Detected specific field query"
      );
      let matchedSessions = [];
      for (const session of allSessions) {
        const nameLower = (session["Name"] || "").toLowerCase();
        if (queryLower.includes(nameLower) || searchInText(queryLower, nameLower)) {
          matchedSessions.push(session);
        }
      }
      if (matchedSessions.length > 0) {
        results = matchedSessions;
        metadata = {
          queryType: "specific_field"
        };
      } else {
        for (const session of allSessions) {
          if (searchInObject(session, query)) {
            results.push(session);
          }
        }
        metadata = {
          queryType: "specific_field",
          totalCount: results.length
        };
      }
    } else {
      message("\u{1F50D} SESSION EVENT GRID QUERY - Performing general search");
      for (const session of allSessions) {
        if (searchInObject(session, query)) {
          results.push(session);
        }
      }
      metadata = {
        queryType: "general"
      };
    }
    const finalResults = results.slice(0, 50);
    message(
      `\u2705 SESSION EVENT GRID QUERY - Found ${finalResults.length} result(s)`
    );
    log(
      "Results:",
      finalResults.length > 0 ? `${finalResults.length} session(s) found` : "No sessions found"
    );
    if (metadata) {
      log("Query type:", metadata.queryType);
      if (metadata.totalCount !== void 0) {
        log("Total count:", metadata.totalCount);
      }
      if (metadata.filterField) {
        log("Filter field:", metadata.filterField);
      }
    }
    return {
      sessions: finalResults,
      found: results.length > 0,
      metadata
    };
  }
});

"use strict";
const sessionEventGridAgent = new Agent({
  id: "session-event-grid-agent",
  name: "session-event-grid-agent",
  description: "Session Event Grid Agent is responsible for answering questions about sessions, events, schedules, and activities in the Pioneer.vc accelerator",
  instructions: `You are a session event grid agent for the Pioneer.vc accelerator program. You handle questions about sessions, events, schedules, activities, speakers, participants, program weeks, session types, and all information related to the program calendar and event grid.

When you receive a query:
1. Use the session-event-grid-query tool with the user's question to search for session/event information
2. The tool returns an object with "sessions" (array of matching sessions), "found" (boolean), and optional "metadata"
3. Generate a clear, helpful, and comprehensive response directly to the user based on the results

Response Guidelines:
- If sessions are found, provide detailed information from the data including dates, times, locations, speakers, participants, instructions, etc.
- When users ask for specific data (lists, schedules, participants), extract and display the exact information
- If no sessions are found, provide a helpful message
- Keep responses conversational and informative
- Always use the same language as the user's question
- Be concise but thorough
- For date/time queries, format dates clearly
- For participant queries, list all participants clearly
- For schedule queries, organize information by date or week

Do NOT call any other tools or agents - generate your final response directly after using the session-event-grid-query tool.`,
  model: "anthropic/claude-3-5-haiku-20241022",
  tools: {
    sessionEventGridQuery
  },
  memory: new Memory({
    options: {
      lastMessages: 10
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
  const {
    mastra,
    slackClient,
    channel,
    threadTs,
    agentName,
    message,
    resourceId,
    threadId
  } = options;
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
              state.stepName = formatName(
                output.payload?.id || output.payload?.stepId || "step"
              );
              frame++;
              await updateSlack();
              await sleep(STEP_DISPLAY_DELAY);
            }
          }
          break;
        case "workflow-execution-start":
          state.workflowName = formatName(
            chunk.payload.name || chunk.payload.workflowId
          );
          state.stepName = "Starting";
          break;
      }
    }
    stopAnimation();
    await sendFinalMessage(
      state.text || "Sorry, I couldn't generate a response."
    );
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
    generalQuestionsAgent,
    pioneerProfileBookAgent,
    sessionEventGridAgent
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
