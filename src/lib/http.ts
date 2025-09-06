import { getAccessToken } from './authToken';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : '');

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function buildUrl(path: string, query?: Record<string, any>) {
	// Allow absolute URLs to pass through unchanged
	if (/^https?:\/\//i.test(path)) {
		const abs = new URL(path);
		if (query) Object.entries(query).forEach(([k, v]) => v != null && abs.searchParams.set(k, String(v)));
		return abs.toString();
	}
	const base = (API_BASE_URL || '').endsWith('/') ? (API_BASE_URL || '') : (API_BASE_URL || '') + '/';
	let url: URL;
	try {
		url = new URL(path.replace(/^\//, ''), base || (typeof window !== 'undefined' ? window.location.origin + '/' : ''));
	} catch {
		url = new URL(path.replace(/^\//, ''), (typeof window !== 'undefined' ? window.location.origin + '/' : ''));
	}
	if (query) {
		Object.entries(query).forEach(([k, v]) => {
			if (v === undefined || v === null) return;
			url.searchParams.set(k, String(v));
		});
	}
	return url.toString();
}

export async function request<T = any>(method: Method, path: string, options: { body?: any; query?: Record<string, any>; headers?: Record<string, string>; rawBody?: BodyInit } = {}): Promise<T> {
	const token = await getAccessToken();
	const url = buildUrl(path, options.query);
	const headers: Record<string, string> = {
		'Accept': 'application/json',
		...(options.rawBody ? {} : { 'Content-Type': 'application/json' }),
		...(token ? { 'Authorization': `Bearer ${token}` } : {}),
		...(options.headers || {})
	};
	const res = await fetch(url, {
		method,
		headers,
		body: options.rawBody ?? (options.body ? JSON.stringify(options.body) : undefined),
	});
	if (!res.ok) {
		let errorBody: any = undefined;
		try { errorBody = await res.json(); } catch {}
		const err: any = new Error(errorBody?.error || `HTTP ${res.status}`);
		err.status = res.status;
		err.body = errorBody;
		throw err;
	}
	const contentType = res.headers.get('content-type') || '';
	if (contentType.includes('application/json')) return res.json() as Promise<T>;
	// @ts-ignore
	return res.text() as Promise<T>;
}

export const http = {
	get: <T>(path: string, query?: Record<string, any>, headers?: Record<string, string>) => request<T>('GET', path, { query, headers }),
	post: <T>(path: string, body?: any, headers?: Record<string, string>) => request<T>('POST', path, { body, headers }),
	patch: <T>(path: string, body?: any, headers?: Record<string, string>) => request<T>('PATCH', path, { body, headers }),
	put: <T>(path: string, body?: any, headers?: Record<string, string>) => request<T>('PUT', path, { body, headers }),
	delete: <T>(path: string, body?: any, headers?: Record<string, string>) => request<T>('DELETE', path, { body, headers }),
};