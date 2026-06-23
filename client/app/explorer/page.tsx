"use client"
import { useState, useEffect, useRef } from "react"
import AppLayout from "@/components/AppLayout"
import { contractApi, type Contract } from "@/api/contract"

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: "",               label: "Tous" },
  { value: "Publié",         label: "Publié" },
  { value: "Terminé",        label: "Terminé" },
  { value: "Annulé",         label: "Annulé" },
  { value: "Contrat conclu", label: "Conclu" },
  { value: "Liste disponible", label: "Liste dispo." },
]

const REGION_OPTIONS = [
  "Abitibi-Témiscamingue", "Bas-Saint-Laurent", "Capitale-Nationale",
  "Centre-du-Québec", "Chaudière-Appalaches", "Côte-Nord", "Estrie",
  "Gaspésie–Îles-de-la-Madeleine", "Lanaudière", "Laurentides", "Laval",
  "Mauricie", "Montréal", "Montérégie", "Nord-du-Québec",
  "Outaouais", "Saguenay–Lac-Saint-Jean",
]

const NATURE_OPTIONS = [
  "Approvisionnement (biens)", "Autres", "Concession", "Services",
  "Partenariat", "Travaux de construction",
  "Ventes de biens immeubles", "Ventes de biens meubles",
]

const MONTHS_FR = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"]

function fmtDate(raw: string | null): string {
  if (!raw) return "—"
  const [y, m, d] = raw.split(" ")[0].split("-")
  return `${parseInt(d)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

function daysLeft(raw: string | null): number | null {
  if (!raw) return null
  const closing = new Date(raw.split(" ")[0])
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((closing.getTime() - today.getTime()) / 86_400_000)
}

function urgencyColor(days: number | null): string {
  if (days === null) return "#8ba5a5"
  if (days <= 3) return "#dc2626"
  if (days <= 7) return "#d97706"
  return "#16a34a"
}

function statusBadgeStyle(statut: string): React.CSSProperties {
  const map: Record<string, { color: string; bg: string }> = {
    "Publié":         { color: "#15803d", bg: "#dcfce7" },
    "Annulé":         { color: "#dc2626", bg: "#fee2e2" },
    "Terminé":        { color: "#6b7280", bg: "#f3f4f6" },
    "Contrat conclu": { color: "#7c3aed", bg: "#ede9fe" },
    "Liste disponible": { color: "#0891b2", bg: "#e0f2fe" },
  }
  const s = map[statut] ?? { color: "#1d4ed8", bg: "#dbeafe" }
  return { color: s.color, background: s.bg }
}

function ContractCard({ c }: { c: Contract }) {
  const days = daysLeft(c.date_fermeture)
  const badge = statusBadgeStyle(c.statut)
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "white",
          border: `1.5px solid ${hovered ? "#b3e6e3" : "#dce8e8"}`,
          borderRadius: 14,
          padding: "18px 22px",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: hovered ? "0 4px 16px rgba(0,179,169,0.08)" : "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                ...badge,
                fontSize: 11, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20,
                letterSpacing: 0.3, flexShrink: 0,
              }}>
                {c.statut}
              </span>
              {c.nature_contrat && (
                <span style={{ fontSize: 11, color: "#8ba5a5", fontWeight: 500 }}>
                  {c.nature_contrat}
                </span>
              )}
            </div>
            <p style={{
              fontWeight: 700, fontSize: 14, color: "#1b2a4a",
              marginBottom: 3, lineHeight: 1.4,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {c.titre}
            </p>
            <p style={{ fontSize: 13, color: "#4a6a6a", marginBottom: 0 }}>{c.organisation}</p>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {days !== null && (
              <div style={{ fontSize: 13, fontWeight: 700, color: urgencyColor(days), marginBottom: 2 }}>
                {days > 0 ? `${days}j` : days === 0 ? "Auj." : "Expiré"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#8ba5a5" }}>
              {c.date_fermeture ? fmtDate(c.date_fermeture) : "—"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#8ba5a5", flexWrap: "wrap" }}>
          {c.region && <span>📍 {c.region}</span>}
          {c.categorie && <span>🗂 {c.categorie.length > 40 ? c.categorie.slice(0, 40) + "…" : c.categorie}</span>}
          <span>📅 {fmtDate(c.date_publication)}</span>
        </div>
      </div>
    </a>
  )
}

function ExplorerContent() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [page, setPage]           = useState(0)

  const [statut,  setStatut]  = useState("")
  const [region,  setRegion]  = useState("")
  const [nature,  setNature]  = useState("")

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    const filter: Record<string, string> = {}
    if (statut) filter.statut = statut
    if (region) filter.region = region
    if (nature) filter.nature_contrat = nature

    contractApi.get_contracts(filter, page * PAGE_SIZE, PAGE_SIZE)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [statut, region, nature, page])

  const changeFilter = (setter: (v: string) => void) => (val: string) => {
    setter(val)
    setPage(0)
  }

  const hasFilters = statut || region || nature

  const SELECT: React.CSSProperties = {
    padding: "9px 14px", border: "1.5px solid #dce8e8", borderRadius: 10,
    fontSize: 13, fontFamily: "inherit", color: "#1b2a4a", background: "white",
    outline: "none", cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238ba5a5' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
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
          Parcourez les appels d'offres gouvernementaux du SEAO.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
        padding: "16px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        {/* Status chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map(s => {
            const active = statut === s.value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => changeFilter(setStatut)(s.value)}
                style={{
                  padding: "7px 14px",
                  border: active ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
                  borderRadius: 50,
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontWeight: active ? 700 : 400,
                  color: active ? "#00B3A9" : "#4a6a6a",
                  background: active ? "rgba(0,179,169,0.08)" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div style={{ width: 1, height: 28, background: "#dce8e8", flexShrink: 0 }} />

        {/* Region select */}
        <select value={region} onChange={e => changeFilter(setRegion)(e.target.value)} style={SELECT}>
          <option value="">Toutes les régions</option>
          {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Nature select */}
        <select value={nature} onChange={e => changeFilter(setNature)(e.target.value)} style={SELECT}>
          <option value="">Toutes les natures</option>
          {NATURE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { changeFilter(setStatut)(""); changeFilter(setRegion)(""); changeFilter(setNature)("") }}
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
          Aucun contrat ne correspond à vos filtres.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map(c => <ContractCard key={c.id} c={c} />)}
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

export default function ExplorerPage() {
  return (
    <AppLayout>
      <ExplorerContent />
    </AppLayout>
  )
}
