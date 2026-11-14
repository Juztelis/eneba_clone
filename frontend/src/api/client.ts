const BASE: string = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'keyhub.token';

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}) {
    super(message);
  }
}

export const tokenStore = {
  get: (): string | null => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

interface Options { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal }

/** Every request goes through here: JSON in/out, bearer token attached, errors normalised into ApiError. */
export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method, signal,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(data?.error?.message ?? 'Something went wrong', res.status, data?.error?.fields ?? {});
  }
  return data as T;
}
