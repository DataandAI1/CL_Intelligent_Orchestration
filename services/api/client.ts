export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl(): string {
  // process.env.VITE_API_BASE_URL is injected by vite's `define` at build time.
  // Default keeps local `npm run dev` working without extra setup.
  const url = typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL;
  return (url && url.length > 0 ? url : 'http://localhost:4000').replace(/\/+$/, '');
}

interface RequestInitJson extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init: RequestInitJson = {}): Promise<T> {
  const { body, headers, ...rest } = init;
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error?: unknown }).error)
        : null) || `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}
