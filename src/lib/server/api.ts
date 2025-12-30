import { BACKEND_DOMAIN_NAME, BEARER_TOKEN_BACKEND } from '$env/static/private';
import type { Company, Employment } from './types';

export async function fetchWithFallback(path: string, options: RequestInit): Promise<Response> {
	try {
		const response = await fetch(`https://${BACKEND_DOMAIN_NAME}${path}`, options);
		return response;
	} catch {
		return fetch(`http://${BACKEND_DOMAIN_NAME}${path}`, options);
	}
}

export async function getUser(userId: string) {
	const response = await fetchWithFallback(`/users/${userId}`, {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function getUserBySlack(slack_id: string) {
	const response = await fetchWithFallback(`/users/by-slack/${slack_id}`, {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function updateUser(userId: string, data: Record<string, unknown>) {
	const response = await fetchWithFallback(`/users/${userId}`, {
		method: 'PATCH',
		headers: {
			Authorization: BEARER_TOKEN_BACKEND,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	return response;
}

// Company API functions

export async function getCompanies(): Promise<Company[]> {
	const response = await fetchWithFallback('/companies', {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return [];
	}

	return response.json();
}

export async function getCompany(companyId: string): Promise<Company | null> {
	const response = await fetchWithFallback(`/companies/${companyId}`, {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function getCompanyByName(name: string): Promise<{ company_id: string } | null> {
	const response = await fetchWithFallback(`/companies/by-name/${encodeURIComponent(name)}`, {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function createCompany(data: { name: string; website?: string }): Promise<Company | null> {
	const response = await fetchWithFallback('/companies', {
		method: 'POST',
		headers: {
			Authorization: BEARER_TOKEN_BACKEND,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

// Employment API functions

export async function getEmploymentsByUser(userId: string): Promise<Employment[]> {
	const response = await fetchWithFallback(`/employments/by-user/${userId}`, {
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	if (!response.ok) {
		return [];
	}

	return response.json();
}

export async function createEmployment(data: {
	user_id: string;
	company_id: string;
	title: string;
	start_date?: string;
	end_date?: string;
	is_current?: boolean;
}): Promise<Employment | null> {
	const response = await fetchWithFallback('/employments', {
		method: 'POST',
		headers: {
			Authorization: BEARER_TOKEN_BACKEND,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function updateEmployment(
	employmentId: string,
	data: {
		title?: string;
		company_id?: string;
		start_date?: string;
		end_date?: string;
		is_current?: boolean;
	}
): Promise<Employment | null> {
	const response = await fetchWithFallback(`/employments/${employmentId}`, {
		method: 'PATCH',
		headers: {
			Authorization: BEARER_TOKEN_BACKEND,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

export async function deleteEmployment(employmentId: string): Promise<boolean> {
	const response = await fetchWithFallback(`/employments/${employmentId}`, {
		method: 'DELETE',
		headers: {
			Authorization: BEARER_TOKEN_BACKEND
		}
	});

	return response.ok;
}

export async function getOrCreateCompany(name: string, website?: string): Promise<Company | null> {
	const existing = await getCompanyByName(name);
	if (existing) {
		return getCompany(existing.company_id);
	}
	return createCompany({ name, website });
}
