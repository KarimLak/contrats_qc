"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import AppLayout from "@/components/AppLayout"
import { ContractCard, daysLeft, isClosingSoon } from "@/components/ContractCard"
import { contractApi, type RecommendedContract } from "@/api/contract"
import { savedContractsApi } from "@/api/savedContracts"
import { getAccessToken } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const PAGE_SIZE = 20

function RecommendedContent() {
  const [contracts, setContracts]     = useState<RecommendedContract[]>([])
  const [total, setTotal]             = useState(0)
  const [closingSoon, setClosingSoon] = useState(0)
  const [nextCursor, setNextCursor]   = useState<string | null>(null)
  const [explorerUrl, setExplorerUrl] = useState("/explorer")
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState("")
  // contract_id -> saved_contracts row id (needed for DELETE /saved/{id}).
  // Session-local only: a page reload won't reflect contracts already saved
  // in a prior session, but re-clicking "Sauvegarder" self-heals since the
  // create endpoint is idempotent (POST /saved on an already-saved contract
  // just returns the existing row instead of erroring or duplicating).
  const [savedIds, setSavedIds]       = useState<Map<number, number>>(new Map())
  const { showToast } = useToast()

  const remainingInExplorer = Math.max(0, total - contracts.length)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")

    const token = getAccessToken()
    if (!token) {
      setError("Session expirée. Veuillez vous reconnecter.")
      setLoading(false)
      return
    }

    contractApi.get_recommended_contracts(null, PAGE_SIZE, token)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
        setClosingSoon(res.closing_soon_count ?? 0)
        setNextCursor(res.next_cursor)
        setExplorerUrl(res.explorer_url ?? "/explorer")
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  function handleLoadMore() {
    const token = getAccessToken()
    if (!token || !nextCursor || loadingMore) return
    setLoadingMore(true)
    contractApi.get_recommended_contracts(nextCursor, PAGE_SIZE, token)
      .then(res => {
        setContracts(cs => [...cs, ...(res.contracts ?? [])])
        setNextCursor(res.next_cursor)
      })
      .catch(() => showToast("Impossible de charger la suite. Réessayez."))
      .finally(() => setLoadingMore(false))
  }

  function handleToggleSave(contract: RecommendedContract) {
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

  function handleNotRelevant(contract: RecommendedContract) {
    const token = getAccessToken()
    if (!token) return
    const index = contracts.findIndex(c => c.id === contract.id)
    const wasClosingSoon = isClosingSoon(daysLeft(contract.date_fermeture))

    setContracts(cs => cs.filter(c => c.id !== contract.id))
    setTotal(t => Math.max(0, t - 1))
    if (wasClosingSoon) setClosingSoon(n => Math.max(0, n - 1))

    const restore = () => {
      setContracts(cs => {
        if (cs.some(c => c.id === contract.id)) return cs
        const next = [...cs]
        next.splice(Math.min(index, next.length), 0, contract)
        return next
      })
      setTotal(t => t + 1)
      if (wasClosingSoon) setClosingSoon(n => n + 1)
    }

    contractApi.set_feedback(contract.id, "not_relevant", token)
      .then(() => {
        showToast(`« ${contract.titre.slice(0, 60)} » masqué des recommandations.`, {
          actionLabel: "Annuler",
          onAction: () => {
            restore()
            contractApi.remove_feedback(contract.id, token).catch(() => {})
          },
        })
      })
      .catch(() => {
        restore()
        showToast("Impossible de masquer ce contrat. Réessayez.")
      })
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px" }}>
            Recommandés pour vous
          </h1>
          {!loading && (
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#00B3A9",
              background: "rgba(0,179,169,0.1)", padding: "3px 12px",
              borderRadius: 20,
            }}>
              {total > 50
                ? `${Math.min(contracts.length, 50).toLocaleString("fr-CA")} des 50 meilleurs sur ${total.toLocaleString("fr-CA")}`
                : `${total.toLocaleString("fr-CA")} résultat${total !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Classés selon la compatibilité avec votre profil d'entreprise. Les contrats expirés ne sont jamais affichés.
          {" "}Cliquez sur le badge de pertinence d'une carte pour voir le détail du score.
        </p>
      </div>

      {/* Closing-soon pinned banner */}
      {!loading && closingSoon > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 12,
          padding: "12px 18px", marginBottom: 16, fontSize: 13.5, color: "#b91c1c", fontWeight: 600,
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: "50%", background: "#dc2626", color: "white",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            !
          </span>
          {closingSoon} avis compatible{closingSoon !== 1 ? "s" : ""} ferme{closingSoon !== 1 ? "nt" : ""} dans les 7 prochains jours.
        </div>
      )}

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
          Aucune recommandation pour l'instant.
          <div style={{ marginTop: 10 }}>
            Complétez vos domaines d'expertise dans{" "}
            <Link href="/profile" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>votre profil</Link>
            {" "}ou parcourez{" "}
            <Link href="/explorer" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>l'explorateur</Link>.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map(c => (
            <ContractCard
              key={c.id}
              c={c}
              matchScore={c.match_score}
              scoreBreakdown={c.score_breakdown}
              saved={savedIds.has(c.id)}
              onToggleSave={() => handleToggleSave(c)}
              onNotRelevant={() => handleNotRelevant(c)}
            />
          ))}
        </div>
      )}

      {/* Load more (keyset, capped at the 50 best) */}
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
            {loadingMore ? "Chargement…" : `Charger plus (${contracts.length} / ${Math.min(total, 50)})`}
          </button>
        </div>
      )}

      {/* Footer: rest of the compatible results live in the Explorateur, not diluted here */}
      {!loading && !nextCursor && remainingInExplorer > 0 && (
        <div style={{
          textAlign: "center", marginTop: 28, padding: "18px 24px",
          background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
          fontSize: 13.5, color: "#4a6a6a",
        }}>
          Voir les {remainingInExplorer.toLocaleString("fr-CA")} autres avis compatibles dans{" "}
          <Link href={explorerUrl} style={{ color: "#00B3A9", fontWeight: 700, textDecoration: "none" }}>
            l'Explorateur →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function RecommendedPage() {
  return (
    <AppLayout>
      <RecommendedContent />
    </AppLayout>
  )
}
