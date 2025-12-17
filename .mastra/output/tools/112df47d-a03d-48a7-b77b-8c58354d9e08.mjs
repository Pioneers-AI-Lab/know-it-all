import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

export { loadJsonData, searchInObject, searchInText };
