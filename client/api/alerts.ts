import { fetchJson } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetchJson<T>(`${API}${path}`, options);
}

export type AlertFrequency = "per_run" | "daily" | "weekly"

// Same shape as an Explorateur query-string filter set — see AlertFilters
// in app/schemas/alert.py, the server-side mirror of this type.
export interface AlertFilters {
  q?: string
  statut?: string[]
  region?: string[]
  nature_contrat?: string[]
  categorie?: string[]
  organisation?: string[]
  closing_within?: number
  match?: "profil"
}

export interface AlertRecipientBrief {
  id: number
  email: string
  label: string | null
  is_default: boolean
  is_verified: boolean
}

export interface AlertEntry {
  id: number
  name: string
  filters: AlertFilters
  frequency: AlertFrequency
  // "HH:MM:SS", required whenever frequency isn't per_run — see
  // AlertCreate/AlertUpdate in app/schemas/alert.py.
  send_time: string | null
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
  recipients: AlertRecipientBrief[]
}

export interface AlertsListResponse {
  items: AlertEntry[]
  total: number
}

export interface AlertPreviewResponse {
  count: number
  is_broad: boolean
}

export interface AlertRecipient {
  id: number
  email: string
  label: string | null
  is_default: boolean
  is_verified: boolean
  created_at: string
}

export interface AlertCreatePayload {
  name: string
  filters: AlertFilters
  frequency: AlertFrequency
  send_time?: string | null
  recipient_ids?: number[]
}

export interface AlertUpdatePayload {
  name?: string
  filters?: AlertFilters
  frequency?: AlertFrequency
  send_time?: string | null
  is_active?: boolean
  recipient_ids?: number[]
}

export const alertsApi = {
  list(token: string): Promise<AlertsListResponse> {
    return request("/alerts/", { method: "GET", headers: { Authorization: `Bearer ${token}` } })
  },

  get(id: number, token: string): Promise<AlertEntry> {
    // No single-alert GET on the backend (list is cheap enough — see
    // app/routers/alert.py) — the edit page fetches the list and finds it.
    return alertsApi.list(token).then(res => {
      const found = res.items.find(a => a.id === id)
      if (!found) throw new Error("Alert not found")
      return found
    })
  },

  create(payload: AlertCreatePayload, token: string): Promise<AlertEntry> {
    return request("/alerts/", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    })
  },

  update(id: number, payload: AlertUpdatePayload, token: string): Promise<AlertEntry> {
    return request(`/alerts/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    })
  },

  remove(id: number, token: string): Promise<null> {
    return request(`/alerts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },

  preview(filters: AlertFilters, token: string): Promise<AlertPreviewResponse> {
    return request("/alerts/preview", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ filters }),
    })
  },
};

export const alertRecipientsApi = {
  list(token: string): Promise<AlertRecipient[]> {
    return request("/alert-recipients/", { method: "GET", headers: { Authorization: `Bearer ${token}` } })
  },

  create(payload: { email: string; label?: string }, token: string): Promise<AlertRecipient> {
    return request("/alert-recipients/", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    })
  },

  update(id: number, payload: { email?: string; label?: string }, token: string): Promise<AlertRecipient> {
    return request(`/alert-recipients/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    })
  },

  remove(id: number, token: string): Promise<null> {
    return request(`/alert-recipients/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  },
};
