export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch('/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!res.ok) {
			const msg = await res.text();
			return { success: false, error: msg };
		}

		const { token, refresh_token } = await res.json();
		localStorage.setItem('access_token', token);

        localStorage.setItem('refresh_token', refresh_token);
		// Parse token payload
		const payload = JSON.parse(atob(token.split('.')[1]));
		localStorage.setItem('user_payload', JSON.stringify(payload));

		return { success: true };
	} catch (err) {
		return { success: false, error: 'Network error' };
	}
}


// src/lib/auth.ts
export function isLoggedIn(): boolean {
	const token = localStorage.getItem('access_token');
	if (!token) return false;

	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		const now = Math.floor(Date.now() / 1000);
		return payload.exp > now;
	} catch (e) {
		console.error('Invalid token:', e);
		return false;
	}
}


// src/lib/func/auth.ts
export async function refreshTokens(): Promise<boolean> {
	const refreshToken = localStorage.getItem('refresh_token');
	if (!refreshToken) return false;

	const res = await fetch('/api/refresh_token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refresh_token: refreshToken })
	});

	if (!res.ok) {
		console.error('Token refresh failed');
		return false;
	}

	const data = await res.json();
	localStorage.setItem('access_token', data.access_token);
	localStorage.setItem('refresh_token', data.refresh_token);
	return true;
}


export function jwtDecode<T = any>(token: string): T {
	try {
		const payloadBase64 = token.split('.')[1];
		const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
		return JSON.parse(decodeURIComponent(escape(payloadJson)));
	} catch (e) {
		console.error('Failed to decode JWT', e);
		throw new Error('Invalid JWT');
	}
}



function getTokenExpiration(token: string): number {
	const decoded: { exp: number } = jwtDecode(token);
	return decoded.exp * 1000;
}

export async function maybeRefresh() {
	const token = localStorage.getItem('access_token');
	if (!token) return;

	const now = Date.now();
	const exp = getTokenExpiration(token);

	// Refresh if less than 2 minutes left
	if (exp - now < 2 * 60 * 1000) {
		await refreshTokens();
	}
}
