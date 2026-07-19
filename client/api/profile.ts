import { fetchJson } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return fetchJson<T>(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
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
