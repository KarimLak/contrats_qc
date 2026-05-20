const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,          // allow callers to override or add headers
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail);
  }
  return res.status === 204 ? null as T : res.json();
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login(username: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  register(username: string, email: string, password: string): Promise<User> {
    return request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  },

  logout(): Promise<null> {
    return request<null>("/auth/logout", { method: "POST" });
  },

  refresh(): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/refresh", { method: "POST" });
  },

  me(token: string): Promise<User> {
    return request<User>("/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};