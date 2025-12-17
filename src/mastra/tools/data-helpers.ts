import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the project root directory by traversing up from the current file location
 */
function getProjectRoot(): string {
	// Get the directory of the current file
	const currentFile = fileURLToPath(import.meta.url);
	let currentDir = dirname(currentFile);

	// Traverse up until we find the project root (where data/ directory exists)
	// or until we've gone too far up
	let attempts = 0;
	const maxAttempts = 10;

	while (attempts < maxAttempts) {
		const dataPath = join(currentDir, 'data');
		// Check if data directory exists by trying to read a known file
		if (existsSync(join(dataPath, 'general-questions.json'))) {
			return currentDir;
		}
		// Data directory not found, go up one level
		const parentDir = dirname(currentDir);
		if (parentDir === currentDir) {
			// Reached filesystem root
			break;
		}
		currentDir = parentDir;
		attempts++;
	}

	// Fallback: return process.cwd()
	return process.cwd();
}

/**
 * Helper function to load JSON data files from the data directory
 */
export function loadJsonData(filename: string): any {
	// Try multiple possible paths
	const possiblePaths = [
		// From project root (when running from source)
		join(process.cwd(), 'data', filename),
		// From .mastra/output (when running built version)
		join(process.cwd(), '..', '..', 'data', filename),
		// From .mastra/output with different structure
		join(process.cwd(), '..', 'data', filename),
		// Using project root detection
		join(getProjectRoot(), 'data', filename),
	];

	for (const filePath of possiblePaths) {
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			return JSON.parse(fileContent);
		} catch (error) {
			// Try next path
			continue;
		}
	}

	// If all paths failed, throw error
	console.error(`Error loading ${filename}: Tried paths:`, possiblePaths);
	throw new Error(
		`Failed to load data file: ${filename}. Checked paths: ${possiblePaths.join(
			', ',
		)}`,
	);
}

/**
 * Helper function to search text content (case-insensitive)
 */
export function searchInText(text: string, query: string): boolean {
	const normalizedText = text.toLowerCase();
	const normalizedQuery = query.toLowerCase();
	return normalizedText.includes(normalizedQuery);
}

/**
 * Helper function to search in object values recursively
 */
export function searchInObject(obj: any, query: string): boolean {
	if (typeof obj === 'string') {
		return searchInText(obj, query);
	}
	if (Array.isArray(obj)) {
		return obj.some((item) => searchInObject(item, query));
	}
	if (obj && typeof obj === 'object') {
		return Object.values(obj).some((value) => searchInObject(value, query));
	}
	return false;
}
