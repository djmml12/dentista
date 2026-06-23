const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshFn: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function configureAuth(opts: {
  onUnauthorized?: () => void;
  refresh?: () => Promise<string | null>;
}) {
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;
  if (opts.refresh) refreshFn = opts.refresh;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  _retry?: boolean;
}

async function doFetch(path: string, opts: RequestOptions): Promise<Response> {
  const { body, auth = true, headers, _retry, ...rest } = opts;
  void _retry;
  const finalHeaders = new Headers(headers);
  if (body !== undefined) finalHeaders.set('Content-Type', 'application/json');
  if (auth && accessToken) finalHeaders.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await doFetch(path, opts);

  if (res.status === 401 && opts.auth !== false && !opts._retry && refreshFn) {
    // Coalescemos refrescos concurrentes en una sola promesa y la limpiamos al terminar.
    refreshPromise ??= refreshFn().finally(() => {
      refreshPromise = null;
    });
    const newToken = await refreshPromise;
    if (newToken) {
      res = await doFetch(path, { ...opts, _retry: true });
    } else if (onUnauthorized) {
      onUnauthorized();
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? res.statusText, payload?.details);
  }

  return payload as T;
}
