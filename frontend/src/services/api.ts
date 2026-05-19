const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const SESSION_EXPIRED_EVENT = 'ss:session-expired';

export const apiFetch = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    const message = body.message || 'Request failed';
    if (res.status === 401 && typeof message === 'string' && message.toLowerCase().includes('session expired')) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message } }));
    }
    throw new Error(message);
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};
