const IDV_BASE_URL = 'https://auth.hackclub.com';

interface IDVAddress {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country?: string;
}

interface IDVIdentity {
	id: string;
	primary_email: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	birthday?: string;
	slack_id?: string;
	addresses?: IDVAddress[];
	verification_status?: 'needs_submission' | 'pending' | 'verified' | 'ineligible';
	ysws_eligible?: boolean;
}

export interface MeResponse {
	identity: IDVIdentity;
}

export async function getIDVMe(accessToken: string): Promise<MeResponse> {
	const response = await fetch(`${IDV_BASE_URL}/api/v1/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`IDV /api/v1/me failed: ${response.status} ${errorText}`);
	}

	return response.json();
}

export type ExternalCheckResult =
	| 'needs_submission'
	| 'pending'
	| 'verified_eligible'
	| 'verified_but_over_18'
	| 'rejected'
	| 'not_found';

export async function checkVerificationBySlackId(slackId: string): Promise<ExternalCheckResult> {
	const response = await fetch(
		`${IDV_BASE_URL}/api/external/check?slack_id=${encodeURIComponent(slackId)}`
	);

	if (!response.ok) {
		throw new Error(`External check failed: ${response.status}`);
	}

	const data = await response.json();
	return data.result;
}
