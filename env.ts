import { z } from 'zod';
import { log, error, message } from '@/lib/print-helpers';

const envSchema = z.object({
	ANTHROPIC_API_KEY: z.string(),
	SLACK_SIGNING_SECRET: z.string(),
	SLACK_APP_TOKEN: z.string(),
});

const publicEnv: Record<string, string> = {
	ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
	SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET!,
	SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN!,
};

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
		if (key.startsWith('NEXT_PUBLIC_')) {
			return publicEnv[key];
		}
		const value = process.env[key];
		if (key === 'SLACK_SIGNING_SECRET' || key === 'SLACK_APP_TOKEN') {
			return value;
		}
		if (!value) {
			throw new Error(`Environment variable ${String(key)} is not set`);
		}
		return value;
	},
};
