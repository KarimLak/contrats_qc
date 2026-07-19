const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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

export interface Document {
  titre:       string | null;
  type:        string | null;
  contenu:     string | null;
  langue:      string | null;
  dimension:   string | null;
  nombre_page: string | null;
}

export interface Contract {
  // Identity
  id:               number;
  numero:           string;
  numero_reference: string;
  type_avis:        string;
  statut:           string;
  url:              string;

  // Core description
  titre:          string;
  organisation:   string;
  nature_contrat: string;
  categorie:      string;
  description:    string | null;

  // Classification
  classifications: string[];
  documents:       Document[];

  // Geography
  region:      string;
  accord:      string;
  territoires: string | null;

  // Dates
  date_publication:           string;
  date_fermeture:             string | null;
  date_limite_plaintes:       string | null;
  date_limite_interet:        string | null;
  date_ouverture_soumissions: string | null;
  date_conclusion:            string | null;

  // Contract terms
  duree_contrat:              string | null;
  duree_contrat_avec_options: string | null;
  options_renouvellement:     string | null;
  contrat_execution_demande:  string | null;
  contrat_a_commandes:        string | null;

  // Submission logistics
  soumission_electronique: string | null;
  endroit_reception:       string | null;
  endroit_ouverture:       string | null;
  adjudication_par_lot:    string | null;
  remarque:                string | null;

  // Bid guarantee
  garantie_nature: string | null;
  garantie_valeur: string | null;

  // Intention-specific
  fournisseur_pressenti: string | null;

  // Contact
  contact_nom:       string | null;
  contact_email:     string | null;
  contact_telephone: string | null;
}

export interface ContractFilterResponse {
  skip:      number;
  limit:     number;
  total:     number;
  contracts: Contract[] | null;
}

export interface ScoreBreakdown {
  expertise:      boolean;
  sector:         boolean;
  region:         boolean;
  contract_type:  boolean;
  sme_reserved:   boolean;
}

// Slimmer than Contract on purpose — the /recommended listing only loads (and
// only ever returns) the columns the card actually renders; full detail is a
// separate fetch at GET /contract/{id} on click-through.
export interface RecommendedContract {
  id:                number;
  titre:             string;
  organisation:      string;
  statut:            string;
  nature_contrat:    string;
  categorie:         string;
  region:            string;
  type_avis:         string;
  date_publication:  string;
  date_fermeture:    string | null;
  match_score:       number;
  score_breakdown:   ScoreBreakdown;
}

export interface RecommendedContractsResponse {
  limit:               number;
  total:               number;
  capped_total:        number;
  closing_soon_count:  number;
  next_cursor:         string | null;
  explorer_url:        string;
  contracts:           RecommendedContract[];
}

export type FeedbackAction = "saved" | "not_relevant";

export interface ContractFeedbackResponse {
  contract_id: number;
  action:      FeedbackAction;
  created_at:  string;
}

export interface SavedContract extends Contract {
  saved_at: string;
}

export interface SavedContractsResponse {
  skip:      number;
  limit:     number;
  total:     number;
  contracts: SavedContract[];
}

export const contractApi = {
  get_contracts(filter: Record<string, string | string[]>, skip: number, limit: number): Promise<ContractFilterResponse> {
    const params = new URLSearchParams()
    params.append("skip", String(skip))
    params.append("limit", String(limit))
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else {
        params.append(key, value)
      }
    }
    return request<ContractFilterResponse>(`/contract/?${params.toString()}`, { method: "GET" })
  },

  get_contract(id: number): Promise<Contract> {
    return request<Contract>(`/contract/${id}`, { method: "GET" })
  },

  get_recommended_contracts(cursor: string | null, limit: number, token: string): Promise<RecommendedContractsResponse> {
    const params = new URLSearchParams()
    if (cursor) params.append("cursor", cursor)
    params.append("limit", String(limit))
    return request<RecommendedContractsResponse>(`/contract/recommended?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  get_saved_contracts(skip: number, limit: number, token: string): Promise<SavedContractsResponse> {
    const params = new URLSearchParams()
    params.append("skip", String(skip))
    params.append("limit", String(limit))
    return request<SavedContractsResponse>(`/contract/saved?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  set_feedback(contractId: number, action: FeedbackAction, token: string): Promise<ContractFeedbackResponse> {
    return request<ContractFeedbackResponse>(`/contract/${contractId}/feedback`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    })
  },

  remove_feedback(contractId: number, token: string): Promise<null> {
    return request<null>(`/contract/${contractId}/feedback`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },
};