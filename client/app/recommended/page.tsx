"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import AppLayout from "@/components/AppLayout"
import { ContractCard } from "@/components/ContractCard"
import { contractApi, type RecommendedContract } from "@/api/contract"
import { getAccessToken } from "@/context/AuthContext"

const PAGE_SIZE = 20

function RecommendedContent() {
  const [contracts, setContracts] = useState<RecommendedContract[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [page, setPage]           = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

    contractApi.get_recommended_contracts(page * PAGE_SIZE, PAGE_SIZE, token)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page])

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
              {total.toLocaleString("fr-CA")} résultat{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Classés selon la compatibilité avec votre profil d'entreprise. Les contrats expirés ne sont jamais affichés.
        </p>
      </div>

      {/* Score legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 14,
        background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
        padding: "14px 20px", marginBottom: 24, fontSize: 12.5, color: "#4a6a6a",
      }}>
        <span style={{ fontWeight: 600, color: "#1b2a4a" }}>Score de pertinence :</span>
        <span><b style={{ color: "#1b2a4a" }}>+35</b> domaine d'expertise</span>
        <span><b style={{ color: "#1b2a4a" }}>+25</b> secteur d'activité</span>
        <span><b style={{ color: "#1b2a4a" }}>+20</b> région</span>
        <span><b style={{ color: "#1b2a4a" }}>+15</b> type de contrat</span>
        <span><b style={{ color: "#1b2a4a" }}>+5</b> avis réservé aux PME</span>
        <span style={{ color: "#8ba5a5" }}>(secteur ou expertise requis pour apparaître)</span>
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
          Aucune recommandation pour l'instant.
          <div style={{ marginTop: 10 }}>
            Complétez vos secteurs et domaines d'expertise dans{" "}
            <Link href="/profile" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>votre profil</Link>
            {" "}ou parcourez{" "}
            <Link href="/explorer" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>l'explorateur</Link>.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map(c => <ContractCard key={c.id} c={c} matchScore={c.match_score} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && contracts.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, marginTop: 32,
        }}>
          <button
            type="button"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            style={{
              padding: "9px 20px", border: "1.5px solid #dce8e8", borderRadius: 10,
              fontSize: 13, fontFamily: "inherit", fontWeight: 500,
              color: page === 0 ? "#c0d4d4" : "#1b2a4a",
              background: "white", cursor: page === 0 ? "not-allowed" : "pointer",
              transition: "border-color 0.15s",
            }}
          >
            ← Précédent
          </button>

          <span style={{ fontSize: 13, color: "#4a6a6a", fontWeight: 500, minWidth: 120, textAlign: "center" }}>
            Page {page + 1} sur {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            style={{
              padding: "9px 20px", border: "1.5px solid #dce8e8", borderRadius: 10,
              fontSize: 13, fontFamily: "inherit", fontWeight: 500,
              color: page >= totalPages - 1 ? "#c0d4d4" : "#1b2a4a",
              background: "white", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
              transition: "border-color 0.15s",
            }}
          >
            Suivant →
          </button>
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
