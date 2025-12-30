import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getUser, getUserBySlack } from '$lib/server/api';
import { sanitizeBackgroundCSSWithInfo } from '$lib/server/sanitizeBackground';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const slackId = url.searchParams.get('slack_id');
	let profile;
	let isOwnProfile = true;

	if (slackId) {
		const slackData = await getUserBySlack(slackId);
		if (!slackData?.user_id) {
			error(404, 'User not found');
		}
		profile = await getUser(slackData.user_id);
		isOwnProfile = false;
	} else {
		profile = await getUser(locals.user.id);
	}

	if (!profile) {
		if (slackId) {
			error(404, 'User not found');
		}
		redirect(302, '/');
	}

	const backgroundResult = sanitizeBackgroundCSSWithInfo(profile.custom_background);

	return {
		user: locals.user,
		profile,
		isOwnProfile,
		backgroundStyle: backgroundResult.css,
		backgroundBlocked: backgroundResult.blocked,
		backgroundBlockedReason: backgroundResult.reason,
		textColors: backgroundResult.textColors
	};
};
