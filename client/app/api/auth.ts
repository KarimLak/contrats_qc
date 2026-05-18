const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: "include", ...options });
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
  token_type: string;
}

export const authApi = {
  login(username: string, password: string): Promise<TokenResponse> {
    const fd = new FormData();
    fd.append("username", username);
    fd.append("password", password);
    return request<TokenResponse>("/auth/login", { method: "POST", body: fd });
  },

  register(username: string, email: string, password: string): Promise<User> {
    return request<User>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
  },

  logout():           Promise<null>          { return request<null>("/auth/logout",  { method: "POST" }); },
  refresh():          Promise<TokenResponse> { return request<TokenResponse>("/auth/refresh", { method: "POST" }); },
  me(token: string):  Promise<User>          { return request<User>("/users/me", { headers: { Authorization: `Bearer ${token}` } }); },
};