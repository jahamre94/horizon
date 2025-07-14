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

		const { token } = await res.json();
		localStorage.setItem('access_token', token);

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
