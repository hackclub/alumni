import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getUser, getUserBySlack } from '$lib/server/api';
import { sanitizeBackgroundCSSWithInfo } from '$lib/server/sanitizeBackground';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const slackData = await getUserBySlack(params.slug);

	if (!slackData?.id) {
		error(404, 'User not found');
	}

	const profile = await getUser(slackData.id);

	if (!profile) {
		error(404, 'User not found');
	}

	const backgroundResult = sanitizeBackgroundCSSWithInfo(profile.custom_background);

	return {
		user: locals.user,
		profile,
		backgroundStyle: backgroundResult.css,
		backgroundBlocked: backgroundResult.blocked,
		backgroundBlockedReason: backgroundResult.reason
	};
};
