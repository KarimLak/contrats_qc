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

// ── Section 1: Le pouls du marché ────────────────────────────────────────────
export interface PulseStats {
  open_now:              number;
  closing_7d:             number;
  published_this_week:   number;
  published_last_week:   number;
  published_wow_pct:     number | null;
  median_days_to_close:  number | null;
  generated_at:          string;
}

// ── Section 2: Radar d'opportunités ──────────────────────────────────────────
export interface HeatmapCell {
  categorie: string;
  region:    string;
  count:     number;
}

export interface ClosingSoonItem {
  id:              number;
  titre:           string;
  organisation:    string;
  categorie:       string;
  region:          string;
  date_fermeture:  string;
  days_remaining:  number;
}

export interface RadarData {
  categories:    string[];
  regions:       string[];
  cells:         HeatmapCell[];
  closing_soon:  ClosingSoonItem[];
  generated_at:  string;
}

// ── Section 3: Intelligence acheteurs ────────────────────────────────────────
export interface OrgCategoryBreakdown {
  categorie: string;
  count:     number;
}

export interface TopOrganization {
  organisation:    string;
  count:           number;
  top_categories:  OrgCategoryBreakdown[];
}

export interface CategoryDelay {
  categorie:     string;
  avg_days:      number;
  sample_size:   number;
}

export interface MonthlyTrendPoint {
  month:              string;
  counts_by_nature:   Record<string, number>;
  total:              number;
}

export interface BuyerIntelligence {
  top_organizations:  TopOrganization[];
  delay_by_category:  CategoryDelay[];
  monthly_trend:      MonthlyTrendPoint[];
  natures:            string[];
  generated_at:       string;
}

// ── Section 4: Signaux compétitifs ───────────────────────────────────────────
export interface OrgCompetitionSignal {
  organisation:          string;
  total:                 number;
  pressenti_count:       number;
  pressenti_pct:         number;
  limited_competition:   boolean;
}

export interface TypeAvisBreakdown {
  type_avis:  string;
  count:      number;
}

export interface CompetitiveSignals {
  organizations:         OrgCompetitionSignal[];
  type_avis_breakdown:   TypeAvisBreakdown[];
  generated_at:          string;
}

export const analyticsApi = {
  get_pulse(): Promise<PulseStats> {
    return request<PulseStats>("/analytics/pulse", { method: "GET" });
  },
  get_radar(): Promise<RadarData> {
    return request<RadarData>("/analytics/radar", { method: "GET" });
  },
  get_buyers(): Promise<BuyerIntelligence> {
    return request<BuyerIntelligence>("/analytics/buyers", { method: "GET" });
  },
  get_signals(): Promise<CompetitiveSignals> {
    return request<CompetitiveSignals>("/analytics/signals", { method: "GET" });
  },
};
