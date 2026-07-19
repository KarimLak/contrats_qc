"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import AppLayout from "@/components/AppLayout"
import UpgradeGate from "@/components/UpgradeGate"
import { daysLeft, fmtDate, isClosingSoon, statusBadgeStyle, urgencyColor } from "@/components/ContractCard"
import { savedContractsApi, type SavedContractEntry, type SavedContractStatus } from "@/api/savedContracts"
import { getAccessToken } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const STATUS_ORDER: SavedContractStatus[] = ["a_evaluer", "en_preparation", "soumis", "non_retenu", "abandonne"]

const STATUS_LABELS: Record<SavedContractStatus, string> = {
  a_evaluer: "À évaluer",
  en_preparation: "En préparation",
  soumis: "Soumis",
  non_retenu: "Non retenu",
  abandonne: "Abandonné",
}

// Mirrors ACTIVE_STATUSES in app/repositories/saved_contract.py — only
// these still count toward the "closing soon" alert banner.
const ACTIVE_STATUSES: SavedContractStatus[] = ["a_evaluer", "en_preparation"]

const NOTE_DEBOUNCE_MS = 800

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function SavedCard({
  entry, onStatusChange, onNoteSave, onRemove,
}: {
  entry: SavedContractEntry
  onStatusChange: (status: SavedContractStatus) => void
  onNoteSave: (note: string) => void
  onRemove: () => void
}) {
  const { contract } = entry
  const days = daysLeft(contract.date_fermeture)
  const closed = days !== null && days < 0
  const badge = statusBadgeStyle(contract.statut)

  const [note, setNote] = useState(entry.note ?? "")
  const debouncedNote = useDebounced(note, NOTE_DEBOUNCE_MS)
  const skipNext = useRef(true)

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return }
    if (debouncedNote === (entry.note ?? "")) return
    onNoteSave(debouncedNote)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNote])

  return (
    <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 14, padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ ...badge, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.3, flexShrink: 0 }}>
              {contract.statut}
            </span>
            {contract.nature_contrat && (
              <span style={{ fontSize: 11, color: "#8ba5a5", fontWeight: 500 }}>{contract.nature_contrat}</span>
            )}
            {closed && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "2px 9px", borderRadius: 20, letterSpacing: 0.3 }}>
                Fermé
              </span>
            )}
            {isClosingSoon(days) && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 20 }}>
                Ferme bientôt
              </span>
            )}
          </div>
          <Link href={`/explorer/${contract.id}`} style={{ textDecoration: "none" }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#1b2a4a", marginBottom: 3, lineHeight: 1.4 }}>
              {contract.titre}
            </p>
          </Link>
          <p style={{ fontSize: 13, color: "#4a6a6a", marginBottom: 0 }}>{contract.organisation}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 12, color: "#8ba5a5", flexWrap: "wrap" }}>
            {contract.region && <span>{contract.region}</span>}
            {contract.region && contract.categorie && <span style={{ color: "#dce8e8" }}>·</span>}
            {contract.categorie && <span>{contract.categorie.length > 40 ? contract.categorie.slice(0, 40) + "…" : contract.categorie}</span>}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {days !== null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: urgencyColor(days), marginBottom: 2 }}>
              {days > 0 ? `${days}j` : days === 0 ? "Auj." : "Expiré"}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#8ba5a5" }}>
            {contract.date_fermeture ? fmtDate(contract.date_fermeture) : "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid #eef4f4", alignItems: "flex-start", flexWrap: "wrap" }}>
        <select
          value={entry.status}
          onChange={e => onStatusChange(e.target.value as SavedContractStatus)}
          style={{
            padding: "7px 10px", borderRadius: 8, border: "1.5px solid #dce8e8",
            fontSize: 12.5, fontFamily: "inherit", fontWeight: 600, color: "#1b2a4a",
            background: "white", cursor: "pointer",
          }}
        >
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ajouter une note (garanties, contacts, prochaine étape…)"
          rows={1}
          style={{
            flex: "1 1 240px", minWidth: 200, resize: "vertical",
            padding: "7px 10px", borderRadius: 8, border: "1.5px solid #dce8e8",
            fontSize: 12.5, fontFamily: "inherit", color: "#1b2a4a",
          }}
        />

        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "7px 12px", borderRadius: 8, border: "1.5px solid #dce8e8",
            background: "white", color: "#8ba5a5", fontSize: 12.5, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Retirer
        </button>
      </div>
    </div>
  )
}

function SavedContent() {
  const [entries, setEntries]     = useState<SavedContractEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [collapsed, setCollapsed] = useState<Set<SavedContractStatus>>(new Set())
  const { showToast } = useToast()

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

    savedContractsApi.list(token)
      .then(res => { if (!cancelled) setEntries(res.items ?? []) })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const closingSoonCount = entries.filter(e =>
    (ACTIVE_STATUSES as string[]).includes(e.status) && isClosingSoon(daysLeft(e.contract.date_fermeture))
  ).length

  function toggleSection(status: SavedContractStatus) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  function handleStatusChange(entry: SavedContractEntry, status: SavedContractStatus) {
    const token = getAccessToken()
    if (!token) return
    const previous = entry.status
    setEntries(es => es.map(e => (e.id === entry.id ? { ...e, status } : e)))
    savedContractsApi.update(entry.id, { status }, token).catch(() => {
      setEntries(es => es.map(e => (e.id === entry.id ? { ...e, status: previous } : e)))
      showToast("Impossible de mettre à jour le statut. Réessayez.")
    })
  }

  function handleNoteSave(entry: SavedContractEntry, note: string) {
    const token = getAccessToken()
    if (!token) return
    setEntries(es => es.map(e => (e.id === entry.id ? { ...e, note } : e)))
    savedContractsApi.update(entry.id, { note }, token).catch(() => {
      showToast("Impossible d'enregistrer la note. Réessayez.")
    })
  }

  function handleRemove(entry: SavedContractEntry) {
    const token = getAccessToken()
    if (!token) return
    setEntries(es => es.filter(e => e.id !== entry.id))

    const restore = () => setEntries(es => (es.some(e => e.id === entry.id) ? es : [...es, entry]))

    savedContractsApi.remove(entry.id, token)
      .then(() => {
        showToast(`« ${entry.contract.titre.slice(0, 60)} » retiré du suivi.`, {
          actionLabel: "Annuler",
          onAction: () => {
            restore()
            savedContractsApi.create(entry.contract.id, token)
              .then(fresh => setEntries(es => es.map(e => (e.id === entry.id ? fresh : e))))
              .catch(() => {})
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
              {entries.length.toLocaleString("fr-CA")} avis
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Suivez chaque avis sauvegardé à travers votre processus de soumission, de l'évaluation jusqu'au dépôt.
        </p>
      </div>

      {/* Closing-soon pinned banner (active statuses only) */}
      {!loading && closingSoonCount > 0 && (
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
          {closingSoonCount} avis de votre pipeline ferme{closingSoonCount !== 1 ? "nt" : ""} cette semaine.
        </div>
      )}

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
      ) : entries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 32px",
          border: "1.5px dashed #dce8e8", borderRadius: 14,
          color: "#8ba5a5", fontSize: 14,
        }}>
          Aucun contrat suivi pour l'instant.
          <div style={{ marginTop: 10 }}>
            Cliquez sur « Sauvegarder » depuis{" "}
            <Link href="/recommended" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>les recommandations</Link>
            {" "}pour démarrer votre suivi.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {STATUS_ORDER.map(status => {
            const items = entries.filter(e => e.status === status)
            if (items.length === 0) return null
            const isCollapsed = collapsed.has(status)
            return (
              <div key={status}>
                <button
                  type="button"
                  onClick={() => toggleSection(status)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    background: "none", border: "none", padding: "0 0 10px", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                  }}
                >
                  <span style={{
                    fontSize: 11, color: "#8ba5a5",
                    transform: isCollapsed ? "rotate(-90deg)" : "none",
                    transition: "transform 0.15s", display: "inline-block",
                  }}>
                    ▾
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1b2a4a" }}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#8ba5a5", background: "#f0f4f4", padding: "2px 9px", borderRadius: 20 }}>
                    {items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {items.map(entry => (
                      <SavedCard
                        key={entry.id}
                        entry={entry}
                        onStatusChange={s => handleStatusChange(entry, s)}
                        onNoteSave={n => handleNoteSave(entry, n)}
                        onRemove={() => handleRemove(entry)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SavedPage() {
  return (
    <AppLayout>
      <UpgradeGate
        feature="Suivi de vos soumissions"
        description="Passez à Pro pour suivre chaque avis sauvegardé à travers votre pipeline de soumission — de l'évaluation jusqu'au dépôt — avec statuts, notes et alertes d'échéance."
        benefits={[
          "Tableau de suivi par statut (à évaluer, en préparation, soumis…)",
          "Notes internes par avis",
          "Alertes sur les échéances qui approchent",
        ]}
      >
        <SavedContent />
      </UpgradeGate>
    </AppLayout>
  )
}
