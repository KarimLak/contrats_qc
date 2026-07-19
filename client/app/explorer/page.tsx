"use client"
import { Suspense, useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { ContractCard } from "@/components/ContractCard"
import { contractApi, type ExplorerContract, type ExplorerFacets, type ExplorerSort, type OrganisationSuggestion } from "@/api/contract"
import { savedContractsApi } from "@/api/savedContracts"
import { getAccessToken } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const SORT_OPTIONS: { value: ExplorerSort; label: string }[] = [
  { value: "date_fermeture", label: "Date de fermeture (urgent d'abord)" },
  { value: "date_publication", label: "Date de publication (récent d'abord)" },
  { value: "pertinence", label: "Pertinence" },
]

const CLOSING_WITHIN_OPTIONS: { value: number | null; label: string }[] = [
  { value: 7, label: "7 jours" },
  { value: 14, label: "14 jours" },
  { value: 30, label: "30 jours" },
  { value: null, label: "Tous" },
]

// A value picked from the URL (deep link) or from a stale facet list might
// not appear in the live facet counts (e.g. it now matches 0 results given
// the other active filters) — keep it selectable/visible anyway with a
// count of 0 rather than letting it silently vanish from the checkbox list
// while still being applied as an active filter.
function mergeFacetOptions(
  facetOptions: { value: string; count: number }[], selected: string[],
): { value: string; count: number }[] {
  const known = new Set(facetOptions.map(o => o.value))
  const missing = selected.filter(v => !known.has(v)).map(v => ({ value: v, count: 0 }))
  return [...facetOptions, ...missing]
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function MultiSelectDropdown({
  label, options, selected, onToggle, onClear,
}: {
  label: string
  options: { value: string; count: number }[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const active = selected.length > 0

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 14px",
          border: active ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
          borderRadius: 10,
          fontSize: 13,
          fontFamily: "inherit",
          fontWeight: active ? 600 : 400,
          color: active ? "#00B3A9" : "#4a6a6a",
          background: active ? "rgba(0,179,169,0.08)" : "white",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {label}{active ? ` (${selected.length})` : ""}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 1L5 5L9 1" stroke={active ? "#00B3A9" : "#8ba5a5"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20,
          background: "white", border: "1.5px solid #dce8e8", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(27,42,74,0.12)",
          padding: 8, minWidth: 260, maxHeight: 320, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {active && (
            <button
              type="button"
              onClick={onClear}
              style={{
                textAlign: "left", padding: "6px 8px", marginBottom: 4,
                border: "none", background: "none", cursor: "pointer",
                fontSize: 12, fontFamily: "inherit", fontWeight: 600, color: "#dc2626",
              }}
            >
              × Effacer la sélection
            </button>
          )}
          {options.length === 0 ? (
            <div style={{ padding: "10px 8px", fontSize: 12.5, color: "#8ba5a5" }}>Aucune option.</div>
          ) : options.map(opt => {
            const checked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 9px", borderRadius: 8, cursor: "pointer",
                  background: checked ? "rgba(0,179,169,0.08)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  style={{ accentColor: "#00B3A9", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "#1b2a4a", lineHeight: 1.4, flex: 1 }}>{opt.value}</span>
                <span style={{ fontSize: 11.5, color: "#8ba5a5", fontWeight: 600, flexShrink: 0 }}>{opt.count}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SortDropdown({ value, onChange }: { value: ExplorerSort; onChange: (v: ExplorerSort) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ExplorerSort)}
      style={{
        padding: "9px 14px", border: "1.5px solid #dce8e8", borderRadius: 10,
        fontSize: 13, fontFamily: "inherit", color: "#1b2a4a", background: "white",
        cursor: "pointer",
      }}
    >
      {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  )
}

function ClosingWithinFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "#f7fafa", borderRadius: 10, padding: 3 }}>
      {CLOSING_WITHIN_OPTIONS.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 12px", borderRadius: 8, border: "none",
              fontSize: 12.5, fontFamily: "inherit", fontWeight: active ? 700 : 500,
              color: active ? "white" : "#4a6a6a",
              background: active ? "#00B3A9" : "transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// Free-text typeahead, not a checkbox dropdown — organisations have a long
// tail (373 distinct at last count), so a static/full list would be
// unusable. Selected organisations render as removable chips.
function OrganisationTypeahead({
  selected, onAdd, onRemove,
}: {
  selected: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
}) {
  const [text, setText] = useState("")
  const debouncedText = useDebounced(text, SEARCH_DEBOUNCE_MS)
  const [suggestions, setSuggestions] = useState<OrganisationSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || debouncedText.length < 2) { setSuggestions([]); return }
    let cancelled = false
    contractApi.get_organisation_suggestions(debouncedText, 8)
      .then(res => { if (!cancelled) setSuggestions(res.filter(s => !selected.includes(s.name))) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText, open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 220 }}>
      <div style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
        padding: selected.length ? "5px 8px" : "9px 14px",
        border: selected.length ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
        borderRadius: 10, background: selected.length ? "rgba(0,179,169,0.08)" : "white",
      }}>
        {selected.map(name => (
          <span key={name} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11.5, fontWeight: 600, color: "#00786f",
            background: "white", border: "1px solid #b3e6e3",
            borderRadius: 20, padding: "3px 6px 3px 10px",
          }}>
            {name.length > 24 ? name.slice(0, 24) + "…" : name}
            <button
              type="button"
              onClick={() => onRemove(name)}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#00786f", fontSize: 13, padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length ? "" : "Organisme…"}
          style={{
            border: "none", outline: "none", fontSize: 13, fontFamily: "inherit",
            color: "#1b2a4a", background: "transparent", flex: 1, minWidth: 90, padding: "3px 0",
          }}
        />
      </div>

      {open && (debouncedText.length >= 2) && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20,
          background: "white", border: "1.5px solid #dce8e8", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(27,42,74,0.12)",
          padding: 8, minWidth: 280, maxHeight: 280, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: "10px 8px", fontSize: 12.5, color: "#8ba5a5" }}>Aucun organisme trouvé.</div>
          ) : suggestions.map(s => (
            <button
              key={s.name}
              type="button"
              onClick={() => { onAdd(s.name); setText(""); setSuggestions([]) }}
              style={{
                display: "flex", justifyContent: "space-between", gap: 10,
                textAlign: "left", padding: "7px 9px", borderRadius: 8,
                border: "none", background: "transparent", cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,179,169,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 13, color: "#1b2a4a" }}>{s.name}</span>
              <span style={{ fontSize: 11.5, color: "#8ba5a5", fontWeight: 600, flexShrink: 0 }}>{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExplorerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contracts, setContracts]     = useState<ExplorerContract[]>([])
  const [total, setTotal]             = useState(0)
  const [facets, setFacets]           = useState<ExplorerFacets | null>(null)
  const [nextCursor, setNextCursor]   = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState("")
  // contract_id -> saved_contracts row id, same session-local convention as
  // /recommended (see its comment): idempotent create() self-heals a stale
  // reload.
  const [savedIds, setSavedIds]       = useState<Map<number, number>>(new Map())
  const { showToast } = useToast()

  // Seeded once from the URL on mount (deep-linkable/shareable state) - read
  // only in the initializer so typing doesn't fight with the URL sync effect.
  const [q, setQ]                   = useState(() => searchParams.get("q") ?? "")
  const [sort, setSort]             = useState<ExplorerSort>(() => (searchParams.get("sort") as ExplorerSort) || "date_fermeture")
  const [closingWithin, setClosingWithin] = useState<number | null>(() => {
    const v = searchParams.get("closing_within")
    return v ? parseInt(v, 10) : null
  })
  const [statuts, setStatuts]         = useState<string[]>(() => searchParams.getAll("statut"))
  const [regions, setRegions]         = useState<string[]>(() => searchParams.getAll("region"))
  const [natures, setNatures]         = useState<string[]>(() => searchParams.getAll("nature_contrat"))
  const [categories, setCategories]   = useState<string[]>(() => searchParams.getAll("categorie"))
  const [organisations, setOrganisations] = useState<string[]>(() => searchParams.getAll("organisation"))
  // Arrives via a deep link from Analytics ("avis compatibles avec votre
  // profil" et al.) — applies compatible_contracts_query(profile) server-
  // side. No dedicated dropdown for it (it's not a pickable value list like
  // the others); the dismissible badge in the filter bar is its only UI.
  const [matchProfil, setMatchProfil] = useState<boolean>(() => searchParams.get("match") === "profil")

  const debouncedQ = useDebounced(q, SEARCH_DEBOUNCE_MS)

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  const hasFilters = statuts.length > 0 || regions.length > 0 || natures.length > 0
    || categories.length > 0 || organisations.length > 0 || closingWithin !== null || debouncedQ.length > 0
    || matchProfil

  const buildQuery = useCallback((cursor: string | null) => ({
    q: debouncedQ || undefined,
    statut: statuts.length ? statuts : undefined,
    region: regions.length ? regions : undefined,
    nature_contrat: natures.length ? natures : undefined,
    categorie: categories.length ? categories : undefined,
    organisation: organisations.length ? organisations : undefined,
    closing_within: closingWithin ?? undefined,
    sort,
    match: matchProfil ? ("profil" as const) : undefined,
    cursor,
    limit: PAGE_SIZE,
  }), [debouncedQ, statuts, regions, natures, categories, organisations, closingWithin, sort, matchProfil])

  // Fresh search: any filter/search/sort change restarts pagination from
  // the top rather than appending.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")

    const token = matchProfil ? (getAccessToken() ?? undefined) : undefined
    contractApi.search_contracts(buildQuery(null), token)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
        setFacets(res.facets)
        setNextCursor(res.next_cursor)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [buildQuery, matchProfil])

  // Keeps the URL in sync so the current search stays bookmarkable/
  // shareable — also the prerequisite for turning a search into a saved
  // Alerte later. Cursor is deliberately not part of the URL: it's an
  // opaque, short-lived pagination position, not part of "the search".
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQ) params.set("q", debouncedQ)
    statuts.forEach(v => params.append("statut", v))
    regions.forEach(v => params.append("region", v))
    natures.forEach(v => params.append("nature_contrat", v))
    categories.forEach(v => params.append("categorie", v))
    organisations.forEach(v => params.append("organisation", v))
    if (closingWithin) params.set("closing_within", String(closingWithin))
    if (sort !== "date_fermeture") params.set("sort", sort)
    if (matchProfil) params.set("match", "profil")
    const query = params.toString()
    router.replace(query ? `/explorer?${query}` : "/explorer", { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, statuts, regions, natures, categories, organisations, closingWithin, sort, matchProfil])

  function handleLoadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const token = matchProfil ? (getAccessToken() ?? undefined) : undefined
    contractApi.search_contracts(buildQuery(nextCursor), token)
      .then(res => {
        setContracts(cs => [...cs, ...(res.contracts ?? [])])
        setNextCursor(res.next_cursor)
      })
      .catch(() => setError("Impossible de charger la suite. Réessayez."))
      .finally(() => setLoadingMore(false))
  }

  function handleToggleSave(contract: ExplorerContract) {
    const token = getAccessToken()
    if (!token) return
    const savedId = savedIds.get(contract.id)

    if (savedId !== undefined) {
      setSavedIds(ids => { const next = new Map(ids); next.delete(contract.id); return next })
      savedContractsApi.remove(savedId, token).catch(() => {
        setSavedIds(ids => new Map(ids).set(contract.id, savedId))
        showToast("Impossible de retirer des sauvegardés. Réessayez.")
      })
      return
    }

    savedContractsApi.create(contract.id, token)
      .then(entry => {
        setSavedIds(ids => new Map(ids).set(contract.id, entry.id))
        showToast(`« ${contract.titre.slice(0, 60)} » ajouté à votre suivi.`, {
          actionLabel: "Annuler",
          onAction: () => {
            setSavedIds(ids => { const next = new Map(ids); next.delete(contract.id); return next })
            savedContractsApi.remove(entry.id, token).catch(() => {})
          },
        })
      })
      .catch(() => {
        showToast("Impossible de sauvegarder ce contrat. Réessayez.")
      })
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px" }}>
            Explorateur de contrats
          </h1>
          {!loading && (
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#00B3A9",
              background: "rgba(0,179,169,0.1)", padding: "3px 12px",
              borderRadius: 20,
            }}>
              {total.toLocaleString("fr-CA")} résultat{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Parcourez les appels d'offres gouvernementaux ouverts du SEAO.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
          <circle cx="10.5" cy="10.5" r="6.5" stroke="#8ba5a5" strokeWidth="1.8" />
          <path d="M20 20l-4.5-4.5" stroke="#8ba5a5" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher un titre, un organisme, une description…"
          style={{
            width: "100%", padding: "13px 16px 13px 44px", border: "1.5px solid #dce8e8",
            borderRadius: 12, fontSize: 14, fontFamily: "inherit", color: "#1b2a4a",
            background: "white", outline: "none", boxSizing: "border-box",
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              border: "none", background: "none", cursor: "pointer", color: "#8ba5a5", fontSize: 18, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{
        background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
        padding: "16px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <MultiSelectDropdown
          label="Statut"
          options={mergeFacetOptions(facets?.statut ?? [], statuts).map(o => ({ value: o.value, count: o.count }))}
          selected={statuts}
          onToggle={v => toggleFilter(setStatuts, v)}
          onClear={() => setStatuts([])}
        />
        <MultiSelectDropdown
          label="Région"
          options={mergeFacetOptions(facets?.region ?? [], regions)}
          selected={regions}
          onToggle={v => toggleFilter(setRegions, v)}
          onClear={() => setRegions([])}
        />
        <MultiSelectDropdown
          label="Nature"
          options={mergeFacetOptions(facets?.nature_contrat ?? [], natures)}
          selected={natures}
          onToggle={v => toggleFilter(setNatures, v)}
          onClear={() => setNatures([])}
        />
        <MultiSelectDropdown
          label="Catégorie"
          options={mergeFacetOptions(facets?.categorie ?? [], categories)}
          selected={categories}
          onToggle={v => toggleFilter(setCategories, v)}
          onClear={() => setCategories([])}
        />
        <OrganisationTypeahead
          selected={organisations}
          onAdd={name => setOrganisations(prev => [...prev, name])}
          onRemove={name => setOrganisations(prev => prev.filter(n => n !== name))}
        />
        <ClosingWithinFilter value={closingWithin} onChange={setClosingWithin} />
        <SortDropdown value={sort} onChange={setSort} />

        {matchProfil && (
          <span style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
            color: "#00786f", background: "rgba(0,179,169,0.08)", border: "1.5px solid #00B3A9",
          }}>
            Compatible avec votre profil
            <button
              type="button"
              onClick={() => setMatchProfil(false)}
              aria-label="Retirer le filtre profil"
              style={{ border: "none", background: "none", cursor: "pointer", color: "#00786f", fontSize: 14, padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ(""); setStatuts([]); setRegions([]); setNatures([]); setCategories([])
              setOrganisations([]); setClosingWithin(null); setMatchProfil(false)
            }}
            style={{
              padding: "7px 14px", border: "1.5px solid #fecaca", borderRadius: 50,
              fontSize: 12, fontFamily: "inherit", fontWeight: 500,
              color: "#dc2626", background: "#fef2f2", cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            × Réinitialiser
          </button>
        )}
      </div>

      {/* Contract list */}
      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "20px 24px", color: "#b91c1c", fontSize: 14 }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              height: 110, borderRadius: 14, background: "#f0f4f4",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      ) : contracts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 32px",
          border: "1.5px dashed #dce8e8", borderRadius: 14,
          color: "#8ba5a5", fontSize: 14,
        }}>
          Aucun contrat ne correspond à votre recherche.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map(c => (
            <ContractCard
              key={c.id}
              c={c}
              saved={savedIds.has(c.id)}
              onToggleSave={() => handleToggleSave(c)}
            />
          ))}
        </div>
      )}

      {/* Load more (keyset) */}
      {!loading && contracts.length > 0 && nextCursor && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: "10px 28px", border: "1.5px solid #dce8e8", borderRadius: 10,
              fontSize: 13.5, fontFamily: "inherit", fontWeight: 600,
              color: "#1b2a4a", background: "white",
              cursor: loadingMore ? "wait" : "pointer",
            }}
          >
            {loadingMore ? "Chargement…" : `Charger plus (${contracts.length} / ${total.toLocaleString("fr-CA")})`}
          </button>
        </div>
      )}
    </div>
  )
}

function ExplorerFallback() {
  return (
    <div style={{ padding: "32px 32px 64px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 110, borderRadius: 14, background: "#f0f4f4" }} />
        ))}
      </div>
    </div>
  )
}

export default function ExplorerPage() {
  return (
    <AppLayout>
      <Suspense fallback={<ExplorerFallback />}>
        <ExplorerContent />
      </Suspense>
    </AppLayout>
  )
}
