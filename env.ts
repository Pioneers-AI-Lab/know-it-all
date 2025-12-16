import { z } from 'zod';
import { log, error, message } from './lib/print-helpers';

const envSchema = z.object({
	SLACK_BOT_TOKEN: z.string(),
	SLACK_SIGNING_SECRET: z.string(),
	ANTHROPIC_API_KEY: z.string(),
});

export type EnvType = z.infer<typeof envSchema>;

export const Env = {
	initialize() {
		const checkEnv = envSchema.safeParse(process.env);
		if (!checkEnv.success) {
			const missingVars = checkEnv.error.issues
				.map((issue) => {
					const path = issue.path.join('.');
					return `  - ${path}: ${issue.message}`;
				})
				.join('\n');

			const errorMessage = `Missing or invalid environment variables:\n${missingVars}\n\nPlease ensure all required environment variables are set in your .env file.`;

			error('Invalid environment variables:', checkEnv.error.issues);
			throw new Error(errorMessage);
		}
	},

	get(key: keyof EnvType): string | undefined {
		const value = process.env[key];
		if (!value) {
			throw new Error(`Environment variable ${String(key)} is not set`);
		}
		return value;
	},
};
