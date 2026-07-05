const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail);
  }
  return res.status === 204 ? null as T : res.json();
}

export interface BusinessProfile {
  id:            number;
  name:          string;
  sector:        string[];
  contract_type: string[];
  expertise:     string[];
  region:        string[];
  size:          number;
  budget_min:    number;
  budget_max:    number;
}

export type BusinessProfileUpdate = Omit<BusinessProfile, "id">;

export const profileApi = {
  getMe(token: string): Promise<BusinessProfile> {
    return request<BusinessProfile>("/profile/me", token, { method: "GET" });
  },

  updateMe(payload: BusinessProfileUpdate, token: string): Promise<BusinessProfile> {
    return request<BusinessProfile>("/profile/me", token, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
