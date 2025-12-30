import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import {
	PUBLIC_HC_OAUTH_CLIENT_ID,
	PUBLIC_HC_OAUTH_REDIRECT_URL,
	PUBLIC_HC_OAUTH_RESPONSE_TYPE
} from '$env/static/public';

const AUTH_URL = 'https://auth.hackclub.com/oauth/authorize';

export const GET: RequestHandler = async () => {
	const params = new URLSearchParams({
		client_id: PUBLIC_HC_OAUTH_CLIENT_ID,
		redirect_uri: PUBLIC_HC_OAUTH_REDIRECT_URL,
		response_type: PUBLIC_HC_OAUTH_RESPONSE_TYPE,
		scope: 'openid profile email slack_id'
	});

	redirect(302, `${AUTH_URL}?${params.toString()}`);
};
