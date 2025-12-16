/**
 * Reverse Workflow - Multi-Step Text Transformation Pipeline
 *
 * This workflow demonstrates how to build complex, multi-step processes in Mastra.
 * It takes input text and transforms it through 4 sequential steps, each building
 * on the output of the previous step.
 *
 * Workflow Pipeline:
 * 1. Analyze: Extract metadata (character count, word count)
 * 2. Reverse: Reverse the text character by character
 * 3. Uppercase: Convert reversed text to ALL CAPS
 * 4. Format: Add decorative ASCII borders and display results
 *
 * Key Concepts:
 * - Steps are chained using .then() to create a pipeline
 * - Each step has typed input/output schemas using Zod
 * - Data flows from one step to the next automatically
 * - Workflow execution emits events that show progress in Slack
 *
 * Workflow vs Tools:
 * - Workflows: Multi-step processes with progress tracking (workflow-step-start events)
 * - Tools: Single-step operations with simpler execution (tool-call events)
 *
 * Usage:
 * - Invoked by reverseAgent when user requests "fancy" transformation
 * - Each step execution is displayed in Slack with animated workflow icons
 * - Final result includes original text, transformed text, and statistics
 *
 * Stream Events:
 * - workflow-execution-start: Workflow begins
 * - workflow-step-start: Each step starts (4 times)
 * - tool-output: Contains nested workflow events
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Step 1: Analyze the input text
 *
 * Extracts basic metadata about the text:
 * - Total character count (including spaces)
 * - Word count (split on whitespace)
 */
const analyzeStep = createStep({
  id: 'analyze-text',
  description: 'Analyzes the input text and extracts metadata',
  inputSchema: z.object({
    text: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { text } = inputData;
    const trimmed = text.trim();
    const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    return {
      text,
      charCount: text.length,
      wordCount,
    };
  },
});

/**
 * Step 2: Reverse the text
 *
 * Takes the analyzed text and reverses it character by character.
 * Preserves metadata from step 1 for use in later steps.
 */
const reverseStep = createStep({
  id: 'reverse-text',
  description: 'Reverses the text character by character',
  inputSchema: z.object({
    text: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  outputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { text, charCount, wordCount } = inputData;
    return {
      original: text,
      reversed: text.split('').reverse().join(''),
      charCount,
      wordCount,
    };
  },
});

/**
 * Step 3: Transform to uppercase
 *
 * Converts the reversed text to ALL CAPS for emphasis.
 * Continues to pass through all accumulated data.
 */
const uppercaseStep = createStep({
  id: 'uppercase-text',
  description: 'Converts the reversed text to uppercase',
  inputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  outputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    uppercased: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { original, reversed, charCount, wordCount } = inputData;
    return {
      original,
      reversed,
      uppercased: reversed.toUpperCase(),
      charCount,
      wordCount,
    };
  },
});

/**
 * Step 4: Format the final output with decorative borders
 *
 * Creates a visually appealing output using Unicode box-drawing characters.
 * Displays original text, transformed result, and statistics in a formatted box.
 */
const formatStep = createStep({
  id: 'format-output',
  description: 'Adds decorative formatting to the final result',
  inputSchema: z.object({
    original: z.string(),
    reversed: z.string(),
    uppercased: z.string(),
    charCount: z.number(),
    wordCount: z.number(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { original, uppercased, charCount, wordCount } = inputData;
    const borderLen = Math.max(uppercased.length + 4, 30);
    const border = '═'.repeat(borderLen);

    const pad = (str: string) => str.padEnd(borderLen + 1) + '║';

    const result = [
      `╔${border}╗`,
      pad(`║ 🔄 REVERSE TRANSFORMATION COMPLETE`),
      `╠${border}╣`,
      pad(`║ Original: "${original}"`),
      pad(`║ Result:   "${uppercased}"`),
      pad(`║ Stats:    ${charCount} chars, ${wordCount} words`),
      `╚${border}╝`,
    ].join('\n');

    return { result };
  },
});

/**
 * Create the 4-step workflow
 *
 * Chains all steps together in sequence:
 * analyzeStep → reverseStep → uppercaseStep → formatStep
 *
 * The .commit() method finalizes the workflow definition and makes it executable.
 * Input schema defines what data the workflow accepts (just text).
 * Output schema defines what data the workflow returns (formatted result string).
 */
export const reverseWorkflow = createWorkflow({
  id: 'reverse-workflow',
  description: 'A 4-step workflow that analyzes, reverses, uppercases, and formats text',
  inputSchema: z.object({
    text: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
})
  .then(analyzeStep)
  .then(reverseStep)
  .then(uppercaseStep)
  .then(formatStep)
  .commit();
