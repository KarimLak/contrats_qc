// Single source of truth for building links into the Explorateur from
// anywhere else in the app (Analytics, Recommandés, ...). Mirrors exactly
// the query-param format client/app/explorer/page.tsx reads on mount
// (searchParams.getAll for multi-value dimensions, .get for the scalars) —
// keep the two in sync if either changes.
export interface ExplorerUrlFilters {
  q?:               string
  statut?:          string[]
  region?:          string[]
  nature_contrat?:  string[]
  categorie?:       string[]
  organisation?:    string[]
  closing_within?:  number
  sort?:            string
  // Applies compatible_contracts_query(profile) server-side — sector OR
  // expertise, the same test /recommended qualifies on — instead of the
  // frontend approximating "compatible" as a categorie=[...] list (which
  // can only encode one arm of that OR and silently undercounts). Requires
  // the caller to be authenticated; see contractApi.search_contracts.
  match?:           "profil"
}

// categorie values can be sent as either the full label stored on
// Contract.categorie ("G17 - Ameublement") or the bare code prefix ("G17")
// — the backend's categorie filter (app/repositories/explorer.py) accepts
// both. Codes make for shorter, stabler links (a label wording change in
// the taxonomy doesn't break an old bookmark) — use this when building a
// link from a label you already have on hand (e.g. a Radar cell).
export function categorieCode(label: string): string {
  const idx = label.indexOf(" - ")
  return idx === -1 ? label : label.slice(0, idx)
}

export function buildExplorerUrl(filters: ExplorerUrlFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.append("q", filters.q)
  filters.statut?.forEach(v => params.append("statut", v))
  filters.region?.forEach(v => params.append("region", v))
  filters.nature_contrat?.forEach(v => params.append("nature_contrat", v))
  filters.categorie?.forEach(v => params.append("categorie", v))
  filters.organisation?.forEach(v => params.append("organisation", v))
  if (filters.closing_within) params.append("closing_within", String(filters.closing_within))
  if (filters.sort) params.append("sort", filters.sort)
  if (filters.match) params.append("match", filters.match)
  const qs = params.toString()
  return qs ? `/explorer?${qs}` : "/explorer"
}
