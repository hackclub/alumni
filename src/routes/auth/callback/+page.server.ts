import { redirect, isRedirect, isHttpError } from '@sveltejs/kit';
import {
	HC_OAUTH_CLIENT_SECRET,
	BEARER_TOKEN_BACKEND,
	BACKEND_DOMAIN_NAME,
	ENCRYPTION_KEY
} from '$env/static/private';
import { PUBLIC_HC_OAUTH_CLIENT_ID, PUBLIC_HC_OAUTH_REDIRECT_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { createCipheriv, randomBytes } from 'crypto';
import { getIDVMe } from '$lib/server/idv';

function hashUserID(userID: string): string {
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
	let encrypted = cipher.update(userID, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return iv.toString('hex') + ':' + encrypted;
}

function decodeJwtPayload<T = Record<string, unknown>>(jwt: string): T {
	const parts = jwt.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const payload = parts[1]
		.replace(/-/g, '+')
		.replace(/_/g, '/')
		.padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

	const json = Buffer.from(payload, 'base64').toString('utf8');
	return JSON.parse(json) as T;
}

function calculateAge(birthdateIso: string): number {
	const dob = new Date(birthdateIso);
	if (Number.isNaN(dob.getTime())) return NaN;

	const today = new Date();
	let age = today.getFullYear() - dob.getFullYear();
	const m = today.getMonth() - dob.getMonth();

	if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
		age--;
	}

	return age;
}

async function fetchWithFallback(path: string, options: RequestInit): Promise<Response> {
	try {
		const response = await fetch(`https://${BACKEND_DOMAIN_NAME}${path}`, options);
		return response;
	} catch {
		return fetch(`http://${BACKEND_DOMAIN_NAME}${path}`, options);
	}
}

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	if (error) {
		console.error('OAuth error:', error, errorDescription);
		redirect(302, '/');
	}

	if (!code) {
		console.error('No authorization code received');
		redirect(302, '/');
	}

	try {
		const params = new URLSearchParams({
			client_id: PUBLIC_HC_OAUTH_CLIENT_ID,
			client_secret: HC_OAUTH_CLIENT_SECRET,
			redirect_uri: PUBLIC_HC_OAUTH_REDIRECT_URL,
			code: code,
			grant_type: 'authorization_code'
		});

		const tokenResponse = await fetch('https://auth.hackclub.com/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error('Token exchange failed:', errorData);
			redirect(302, '/');
		}

		const data = await tokenResponse.json();
		const accessToken: string | undefined = data.access_token;
		const idToken: string | undefined = data.id_token;

		if (!accessToken || !idToken) {
			console.error('Missing access_token or id_token in token response', data);
			redirect(302, '/');
		}

		let claims: Record<string, unknown>;
		try {
			claims = decodeJwtPayload(idToken);
			console.log('OIDC claims:', claims);
		} catch (e) {
			console.error('Failed to decode id_token', e);
			redirect(302, '/');
		}

		let birthdate: string | undefined;
		let idvData: Awaited<ReturnType<typeof getIDVMe>> | null = null;

		try {
			idvData = await getIDVMe(accessToken);
			console.log('IDV me response:', idvData);
			birthdate = idvData.identity.birthday;
		} catch (e) {
			console.error('Failed to fetch IDV /api/v1/me:', e);
			redirect(302, '/?error=' + encodeURIComponent('Failed to verify your identity.'));
		}

		if (!birthdate) {
			console.error('No birthdate in userinfo');
			redirect(
				302,
				'/?error=' +
					encodeURIComponent('You must share your birthdate in Hack Club Account to continue.')
			);
		}

		const age = calculateAge(birthdate);

		if (Number.isNaN(age)) {
			console.error('Invalid birthdate format:', birthdate);
			redirect(302, '/?error=' + encodeURIComponent('Could not read your birthdate.'));
		}

		if (age < 18) {
			console.log('User is under 18, denying access');
			redirect(302, '/?error=' + encodeURIComponent('You must be 18 or older to use this service.'));
		}

		const slackId = claims.slack_id as string | undefined;
		if (!slackId) {
			console.error('Missing slack_id claim');
			redirect(302, '/?error=' + encodeURIComponent('Slack ID is missing from your Hack Club Account.'));
		}

		const userResponse = await fetchWithFallback(
			`/users/by-slack/${encodeURIComponent(slackId)}`,
			{
				headers: {
					Authorization: `${BEARER_TOKEN_BACKEND}`
				}
			}
		);

		let user = await userResponse.json();

		if (!user || !user.user_id) {
			console.log('User not found for slack_id, creating new user');

			const createUserResponse = await fetchWithFallback('/users', {
				method: 'POST',
				headers: {
					Authorization: `${BEARER_TOKEN_BACKEND}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					first_name: (claims.given_name as string) || (claims.name as string) || '',
					second_name: (claims.family_name as string) || '',
					email: (claims.email as string) || '',
					slack_id: slackId,
					slack_handle: '',
					github_username: '',
					instagram: '',
					linkedin: '',
					personal_site: '',
					birthdate: birthdate,
					ysws_eligible: idvData?.identity.ysws_eligible ? 'true' : 'false',
					city: '',
					state: '',
					country: '',
					ex_hq: false,
					phone_number: ''
				})
			});

			if (!createUserResponse.ok) {
				const errorText = await createUserResponse.text();
				console.error('Failed to create user:', createUserResponse.status, errorText);

				if (createUserResponse.status === 409 && claims.email) {
					console.log('User creation conflict, searching by email');
					const emailUserResponse = await fetchWithFallback(
						`/users/by-email/${encodeURIComponent(claims.email as string)}`,
						{
							headers: {
								Authorization: `${BEARER_TOKEN_BACKEND}`
							}
						}
					);

					if (emailUserResponse.ok) {
						user = await emailUserResponse.json();
					}
				}

				if (!user || !user.user_id) {
					redirect(
						302,
						'/?error=' +
							encodeURIComponent(
								'Error creating user, you may need to update your settings in Hack Club Account'
							)
					);
				}
			} else {
				user = await createUserResponse.json();
			}
		}

		if (user && user.user_id && user.first_login) {
			try {
				const patchResponse = await fetchWithFallback(`/users/${user.user_id}`, {
					method: 'PATCH',
					headers: {
						Authorization: `${BEARER_TOKEN_BACKEND}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						first_name: (claims.given_name as string) || (claims.name as string) || '',
						second_name: (claims.family_name as string) || '',
						email: (claims.email as string) || '',
						slack_id: slackId,
						ysws_eligible: idvData?.identity.ysws_eligible ? 'true' : 'false'
						})
				});

				if (!patchResponse.ok) {
					console.error('Failed to patch first_login user data');
				} else {
					const updatedUser = await patchResponse.json();
					user = updatedUser;
				}
			} catch (e) {
				console.error('Error patching first_login user', e);
			}
		}

		const hashedUserID = hashUserID(user.user_id);
		cookies.set('userID', hashedUserID, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
		cookies.set('accessToken', accessToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax'
		});
		redirect(302, '/home');
	} catch (err) {
		if (isRedirect(err) || isHttpError(err)) {
			throw err;
		}
		console.error('Error exchanging code for token:', err);
		redirect(302, '/');
	}
};
