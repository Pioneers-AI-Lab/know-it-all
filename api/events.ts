import type { SlackEvent } from '@slack/web-api';
import {
	assistantThreadMessage,
	handleNewAssistantMessage,
} from '@/lib/handle-messages';
import { waitUntil } from '@vercel/functions';
import { handleNewAppMention } from '@/lib/handle-app-mention';
import { verifyRequest, getBotId } from '@/lib/slack-utils';

export async function POST(request: Request) {
	const rawBody = await request.text();

	let payload;
	try {
		payload = JSON.parse(rawBody);
	} catch (error) {
		console.error('Error parsing request body:', error);
		return new Response('Invalid JSON', { status: 400 });
	}

	const requestType = payload.type as 'url_verification' | 'event_callback';

	// See https://api.slack.com/events/url_verification
	if (requestType === 'url_verification') {
		const challenge = payload.challenge;
		if (!challenge) {
			console.error('Missing challenge in url_verification request');
			return new Response('Missing challenge', { status: 400 });
		}
		return new Response(challenge, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain',
			},
		});
	}

	await verifyRequest({ requestType, request, rawBody });

	try {
		const botUserId = await getBotId();

		const event = payload.event as SlackEvent;

		if (event.type === 'app_mention') {
			waitUntil(handleNewAppMention(event, botUserId));
		}

		if (event.type === 'assistant_thread_started') {
			waitUntil(assistantThreadMessage(event));
		}

		if (
			event.type === 'message' &&
			!event.subtype &&
			event.channel_type === 'im' &&
			!event.bot_id &&
			!event.bot_profile &&
			event.bot_id !== botUserId
		) {
			waitUntil(handleNewAssistantMessage(event, botUserId));
		}

		return new Response('Success!', { status: 200 });
	} catch (error) {
		console.error('Error generating response', error);
		return new Response('Error generating response', { status: 500 });
	}
}
