import { fetchJson } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return fetchJson<T>(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
}

// ── Block 1: KPIs "Votre marché" ─────────────────────────────────────────────
export interface ProfileKpis {
  profile_ready:       boolean;
  compatible_open:     number;
  closing_7d:           number;
  new_this_week:        number;
  new_last_week:        number;
  total_open:           number;
  pct_of_market:        number;
  profile_categories:   string[];
  profile_sectors:      string[];
}

// ── Block 2: Pipeline d'échéances ────────────────────────────────────────────
export interface DeadlinePreviewItem {
  id:              number;
  titre:           string;
  organisation:    string;
  categorie:       string;
  region:          string;
  date_fermeture:  string | null;
}

export interface DeadlineBucket {
  label:    string;
  count:    number;
  preview:  DeadlinePreviewItem[];
}

export interface DeadlinePipeline {
  buckets: DeadlineBucket[];
}

// ── Block 3: Radar d'opportunités ────────────────────────────────────────────
export interface HeatmapCell {
  categorie: string;
  region:    string;
  count:     number;
}

export interface RadarData {
  categories:           string[];
  adjacent_categories:  string[];
  regions:              string[];
  cells:                HeatmapCell[];
}

// ── Block 4: Intelligence acheteurs (profil + signaux compétitifs) ──────────
export interface OrgCategoryBreakdown {
  categorie: string;
  count:     number;
}

export interface BuyerOrganization {
  organisation:      string;
  open_count:        number;
  categories:        OrgCategoryBreakdown[];
  pressenti_count:   number;
  pressenti_pct:     number;
}

export interface BuyerIntelligence {
  organizations: BuyerOrganization[];
}

// ── Block 5: Fenêtre de réaction ─────────────────────────────────────────────
export interface ReactionCategory {
  categorie:     string;
  median_days:   number;
  sample_size:   number;
}

export interface ReactionWindow {
  categories:          ReactionCategory[];
  market_median_days:  number | null;
}

// ── Block 6: Tendance ─────────────────────────────────────────────────────────
export interface TrendWeek {
  weeks_ago:      number;
  profile_count:  number;
  market_count:   number;
}

export interface Trend {
  weeks: TrendWeek[];
}

export const analyticsApi = {
  get_kpis(token: string): Promise<ProfileKpis> {
    return request<ProfileKpis>("/analytics/kpis", token, { method: "GET" });
  },
  get_pipeline(token: string): Promise<DeadlinePipeline> {
    return request<DeadlinePipeline>("/analytics/pipeline", token, { method: "GET" });
  },
  get_radar(token: string): Promise<RadarData> {
    return request<RadarData>("/analytics/radar", token, { method: "GET" });
  },
  get_buyers(token: string): Promise<BuyerIntelligence> {
    return request<BuyerIntelligence>("/analytics/buyers", token, { method: "GET" });
  },
  get_reaction(token: string): Promise<ReactionWindow> {
    return request<ReactionWindow>("/analytics/reaction", token, { method: "GET" });
  },
  get_trend(token: string): Promise<Trend | null> {
    return request<Trend | null>("/analytics/trend", token, { method: "GET" });
  },
};
