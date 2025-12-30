import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import {
	getUser,
	updateUser,
	getOrCreateCompany,
	createEmployment,
	updateEmployment,
	deleteEmployment
} from '$lib/server/api';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const profile = await getUser(locals.user.id);

	if (!profile) {
		redirect(302, '/');
	}

	return {
		user: locals.user,
		profile
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		const updateData: Record<string, string | null> = {
			first_name: formData.get('first_name') as string,
			second_name: formData.get('second_name') as string,
			email: formData.get('email') as string,
			github_username: formData.get('github_username') as string,
			instagram: formData.get('instagram') as string,
			linkedin: formData.get('linkedin') as string,
			personal_site: formData.get('personal_site') as string,
			city: formData.get('city') as string,
			state: formData.get('state') as string,
			country: formData.get('country') as string,
			phone_number: formData.get('phone_number') as string,
			custom_background: (formData.get('custom_background') as string) || null
		};

		const response = await updateUser(locals.user.id, updateData);

		if (!response.ok) {
			return fail(400, { error: 'Failed to update profile' });
		}

		redirect(302, '/profile');
	},

	addEmployment: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const companyName = formData.get('company_name') as string;
		const title = formData.get('title') as string;
		const startDate = formData.get('start_date') as string;
		const endDate = formData.get('end_date') as string;
		const isCurrent = formData.get('is_current') === 'on';

		if (!companyName || !title) {
			return fail(400, { error: 'Company name and title are required' });
		}

		const company = await getOrCreateCompany(companyName);
		if (!company) {
			return fail(400, { error: 'Failed to create or find company' });
		}

		const employment = await createEmployment({
			user_id: locals.user.id,
			company_id: company.company_id,
			title,
			start_date: startDate || undefined,
			end_date: isCurrent ? undefined : endDate || undefined,
			is_current: isCurrent
		});

		if (!employment) {
			return fail(400, { error: 'Failed to add employment' });
		}

		return { success: true };
	},

	updateEmployment: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const employmentId = formData.get('employment_id') as string;
		const companyName = formData.get('company_name') as string;
		const title = formData.get('title') as string;
		const startDate = formData.get('start_date') as string;
		const endDate = formData.get('end_date') as string;
		const isCurrent = formData.get('is_current') === 'on';

		if (!employmentId) {
			return fail(400, { error: 'Employment ID is required' });
		}

		const updateData: Record<string, unknown> = {};

		if (title) {
			updateData.title = title;
		}

		if (companyName) {
			const company = await getOrCreateCompany(companyName);
			if (company) {
				updateData.company_id = company.company_id;
			}
		}

		if (startDate) {
			updateData.start_date = startDate;
		}

		updateData.is_current = isCurrent;
		updateData.end_date = isCurrent ? null : endDate || null;

		const employment = await updateEmployment(employmentId, updateData);

		if (!employment) {
			return fail(400, { error: 'Failed to update employment' });
		}

		return { success: true };
	},

	deleteEmployment: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const employmentId = formData.get('employment_id') as string;

		if (!employmentId) {
			return fail(400, { error: 'Employment ID is required' });
		}

		const success = await deleteEmployment(employmentId);

		if (!success) {
			return fail(400, { error: 'Failed to delete employment' });
		}

		return { success: true };
	},

	updatePicture: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const profilePicture = formData.get('profile_picture') as string;

		if (!profilePicture) {
			return fail(400, { error: 'No image provided' });
		}

		const response = await updateUser(locals.user.id, { profile_picture: profilePicture });

		if (!response.ok) {
			return fail(400, { error: 'Failed to update profile picture' });
		}

		return { success: true };
	},

	removePicture: async ({ locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const response = await updateUser(locals.user.id, { profile_picture: null });

		if (!response.ok) {
			return fail(400, { error: 'Failed to remove profile picture' });
		}

		return { success: true };
	}
};
