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

export const contractApi = {
  get_contracts(filter: Record<string, string>, skip: number, limit: number): Promise<ContractFilterResponse> {

    const params = new URLSearchParams()
    params.append("skip", String(skip))
    params.append("limit", String(limit))

    for(const key in filter) {
         params.append(key, filter[key])
    }
return request<ContractFilterResponse>(`/contracts?${params.toString()}`, {
      method: "GET",
    });
  },
};