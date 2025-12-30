import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getUser } from '$lib/server/api';
import { sanitizeBackgroundCSSWithInfo } from '$lib/server/sanitizeBackground';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const profile = await getUser(locals.user.id);

	if (!profile) {
		redirect(302, '/');
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
