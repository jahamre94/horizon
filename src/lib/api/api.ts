import { maybeRefresh } from './auth';

type APIResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

function getAuthHeaders(): HeadersInit {
	const token = localStorage.getItem('access_token');
	const tenant = JSON.parse(localStorage.getItem('selected_tenant') || 'null');

	return {
		Authorization: token ? `Bearer ${token}` : '',
		'X-Tenant-ID': tenant?.id || '',
		'Content-Type': 'application/json'
	};
}

async function apiFetch<T>(
	input: string,
	init: RequestInit = {}
): Promise<APIResult<T>> {
	try {
		await maybeRefresh();

		const res = await fetch(input, {
			...init,
			headers: {
				...getAuthHeaders(),
				...(init.headers || {})
			}
		});

		if (!res.ok) {
			const msg = await res.text();
			return { success: false, error: msg || `Request failed: ${res.status}` };
		}

		const json = await res.json();
		return { success: true, data: json as T };
	} catch (err) {
		return { success: false, error: 'Network error' };
	}
}

// GET wrapper
export async function apiGet<T>(url: string): Promise<APIResult<T>> {
	return apiFetch<T>(url, { method: 'GET' });
}

// POST wrapper
export async function apiPost<T, B = unknown>(
	url: string,
	body: B
): Promise<APIResult<T>> {
	return apiFetch<T>(url, {
		method: 'POST',
		body: JSON.stringify(body)
	});
}

// PUT wrapper
export async function apiPut<T, B = unknown>(
	url: string,
	body: B
): Promise<APIResult<T>> {
	return apiFetch<T>(url, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
}

// DELETE wrapper
export async function apiDelete<T>(url: string): Promise<APIResult<T>> {
	return apiFetch<T>(url, { method: 'DELETE' });
}
