"use client"
import { Suspense, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { ContractCard } from "@/components/ContractCard"
import { ExplorerFilterBar, useDebounced } from "@/components/ExplorerFilterBar"
import { contractApi, type ExplorerContract, type ExplorerFacets, type ExplorerSort } from "@/api/contract"
import { savedContractsApi } from "@/api/savedContracts"
import { getAccessToken } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

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

      {/* Filter bar (shared with the Alertes create/edit form — see client/components/ExplorerFilterBar.tsx) */}
      <ExplorerFilterBar
        state={{ statuts, regions, natures, categories, organisations, closingWithin, sort, matchProfil }}
        setStatuts={setStatuts}
        setRegions={setRegions}
        setNatures={setNatures}
        setCategories={setCategories}
        setOrganisations={setOrganisations}
        setClosingWithin={setClosingWithin}
        setSort={setSort}
        setMatchProfil={setMatchProfil}
        facets={facets}
        hasExtraActiveFilter={debouncedQ.length > 0}
        onResetExtra={() => setQ("")}
      />

      {/* Pre-fills the alert form with whatever's active in the URL right now. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, marginTop: -12 }}>
        <Link
          href={`/alerts?create=1&${searchParams.toString()}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "#00B3A9", textDecoration: "none",
          }}
        >
          🔔 Créer une alerte à partir de cette recherche
        </Link>
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
