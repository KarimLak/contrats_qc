"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import AppLayout from "@/components/AppLayout"
import { ContractCard } from "@/components/ContractCard"
import { contractApi, type SavedContract } from "@/api/contract"
import { getAccessToken } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const PAGE_SIZE = 20

function SavedContent() {
  const [contracts, setContracts] = useState<SavedContract[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [page, setPage]           = useState(0)
  const { showToast } = useToast()

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

    contractApi.get_saved_contracts(page * PAGE_SIZE, PAGE_SIZE, token)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page])

  function handleUnsave(contract: SavedContract) {
    const token = getAccessToken()
    if (!token) return
    const index = contracts.findIndex(c => c.id === contract.id)

    setContracts(cs => cs.filter(c => c.id !== contract.id))
    setTotal(t => Math.max(0, t - 1))

    const restore = () => {
      setContracts(cs => {
        if (cs.some(c => c.id === contract.id)) return cs
        const next = [...cs]
        next.splice(Math.min(index, next.length), 0, contract)
        return next
      })
      setTotal(t => t + 1)
    }

    contractApi.remove_feedback(contract.id, token)
      .then(() => {
        showToast(`« ${contract.titre.slice(0, 60)} » retiré des sauvegardés.`, {
          actionLabel: "Annuler",
          onAction: () => {
            restore()
            contractApi.set_feedback(contract.id, "saved", token).catch(() => {})
          },
        })
      })
      .catch(() => {
        restore()
        showToast("Impossible de retirer ce contrat. Réessayez.")
      })
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px" }}>
            Sauvegardés
          </h1>
          {!loading && (
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#00B3A9",
              background: "rgba(0,179,169,0.1)", padding: "3px 12px",
              borderRadius: 20,
            }}>
              {total.toLocaleString("fr-CA")} contrat{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Les contrats que vous avez mis de côté depuis l'explorateur ou les recommandations.
        </p>
      </div>

      {/* Contract list */}
      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "20px 24px", color: "#b91c1c", fontSize: 14 }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
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
          Aucun contrat sauvegardé pour l'instant.
          <div style={{ marginTop: 10 }}>
            Cliquez sur « Sauvegarder » depuis{" "}
            <Link href="/recommended" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>les recommandations</Link>
            {" "}ou{" "}
            <Link href="/explorer" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>l'explorateur</Link>.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map(c => (
            <ContractCard
              key={c.id}
              c={c}
              saved={true}
              onToggleSave={() => handleUnsave(c)}
            />
          ))}
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

export default function SavedPage() {
  return (
    <AppLayout>
      <SavedContent />
    </AppLayout>
  )
}
