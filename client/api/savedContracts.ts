const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail);
  }
  return res.status === 204 ? null as T : res.json();
}

export type SavedContractStatus = "a_evaluer" | "en_preparation" | "soumis" | "non_retenu" | "abandonne"

// Same lean shape as RecommendedContract/ExplorerContract — only the
// columns the card renders.
export interface SavedContractCard {
  id:                number
  titre:             string
  organisation:      string
  statut:            string
  nature_contrat:    string
  categorie:         string
  region:            string
  type_avis:         string
  date_publication:  string
  date_fermeture:    string | null
}

export interface SavedContractEntry {
  id:         number
  status:     SavedContractStatus
  note:       string | null
  created_at: string
  updated_at: string
  contract:   SavedContractCard
}

export interface SavedContractsResponse {
  items: SavedContractEntry[]
  total: number
}

export const savedContractsApi = {
  list(token: string): Promise<SavedContractsResponse> {
    return request<SavedContractsResponse>("/saved/", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // Idempotent server-side: saving an already-saved contract just returns
  // its existing row (status/note untouched), never resets it.
  create(contractId: number, token: string): Promise<SavedContractEntry> {
    return request<SavedContractEntry>("/saved/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contract_id: contractId }),
    })
  },

  update(savedId: number, updates: { status?: SavedContractStatus; note?: string | null }, token: string): Promise<SavedContractEntry> {
    return request<SavedContractEntry>(`/saved/${savedId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
  },

  remove(savedId: number, token: string): Promise<null> {
    return request<null>(`/saved/${savedId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  alertsCount(token: string): Promise<{ count: number }> {
    return request<{ count: number }>("/saved/alerts-count", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },
};
