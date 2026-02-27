type QueryPrimitive = string | number | boolean;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '';
  return raw ? trimTrailingSlash(raw) : '';
}

export function buildApiUrl(
  path: string,
  query?: Record<string, QueryPrimitive | null | undefined>,
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  const url = `${base}${normalizedPath}`;

  if (!query || Object.keys(query).length === 0) {
    return url || normalizedPath;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  if (!qs) return url || normalizedPath;
  return `${url || normalizedPath}?${qs}`;
}

export function buildServerApiUrl(
  path: string,
  query?: Record<string, QueryPrimitive | null | undefined>,
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base =
    trimTrailingSlash(process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '') ||
    `http://localhost:${process.env.PORT || '3000'}`;
  const url = `${base}${normalizedPath}`;

  if (!query || Object.keys(query).length === 0) {
    return url;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return url;
  return `${url}?${qs}`;
}
