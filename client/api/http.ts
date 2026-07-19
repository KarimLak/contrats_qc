const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

let _token: string | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;
let _refreshInFlight: Promise<string | null> | null = null;
let _onExpired: (() => void) | null = null;

// Refresh this long before the access token's actual `exp`, so the
// proactive timer always lands before it goes stale even with some
// network/clock slop.
const REFRESH_MARGIN_MS = 60_000;

function decodeExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return _token;
}

// Lets AuthContext react (log the user out client-side) when the refresh
// token itself is no longer valid, instead of the app silently sitting on
// a null token until the next request fails.
export function onAuthExpired(cb: () => void): void {
  _onExpired = cb;
}

export function setAccessToken(token: string | null): void {
  _token = token;
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
  if (!token) return;

  const expMs = decodeExpiryMs(token);
  if (expMs === null) return;
  const delay = Math.max(0, expMs - Date.now() - REFRESH_MARGIN_MS);
  _refreshTimer = setTimeout(() => { refreshAccessToken(); }, delay);
}

async function doRefresh(): Promise<string | null> {
  const res = await fetch(`${API}/auth/refresh`, { method: "POST", credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.access_token ?? null;
}

// Concurrent callers (the proactive timer firing at the same moment as a
// request 401ing, or several requests 401ing together) share one in-flight
// refresh instead of each firing their own against the backend.
export function refreshAccessToken(): Promise<string | null> {
  if (!_refreshInFlight) {
    _refreshInFlight = doRefresh()
      .then(token => {
        setAccessToken(token);
        if (!token) _onExpired?.();
        return token;
      })
      .finally(() => { _refreshInFlight = null; });
  }
  return _refreshInFlight;
}

// Shared fetch used by every api/*.ts request() helper: on a 401 for a
// request that was carrying an Authorization header, refreshes the access
// token once and retries the same request with the new one before giving
// up. Requests with no Authorization header (public endpoints) are left
// alone — a 401 there isn't a stale-token situation.
export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string> | undefined) };
  const hadAuthHeader = "Authorization" in headers;

  let res = await fetch(url, { credentials: "include", ...options, headers });

  if (res.status === 401 && hadAuthHeader) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await fetch(url, { credentials: "include", ...options, headers: { ...headers, Authorization: `Bearer ${fresh}` } });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed");
  }
  return res.status === 204 ? (null as T) : res.json();
}
