"use client"
import { useState, useEffect, useRef } from "react"
import AppLayout from "@/components/AppLayout"
import { ContractCard } from "@/components/ContractCard"
import { contractApi, type Contract } from "@/api/contract"

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: "Publié",           label: "Publié" },
  { value: "Terminé",          label: "Terminé" },
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

function MultiSelectDropdown({
  label, options, selected, onToggle, onClear,
}: {
  label: string
  options: { value: string; label: string }[]
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
          padding: 8, minWidth: 240, maxHeight: 300, overflowY: "auto",
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
          {options.map(opt => {
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
                <span style={{ fontSize: 13, color: "#1b2a4a", lineHeight: 1.4 }}>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExplorerContent() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [page, setPage]           = useState(0)

  const [statuts, setStatuts] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [natures, setNatures] = useState<string[]>([])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    const filter: Record<string, string[]> = {}
    if (statuts.length) filter.statut = statuts
    if (regions.length) filter.region = regions
    if (natures.length) filter.nature_contrat = natures

    contractApi.get_contracts(filter, page * PAGE_SIZE, PAGE_SIZE)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [statuts, regions, natures, page])

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    setPage(0)
  }

  const hasFilters = statuts.length > 0 || regions.length > 0 || natures.length > 0

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
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <MultiSelectDropdown
          label="Statut"
          options={STATUS_OPTIONS}
          selected={statuts}
          onToggle={v => toggleFilter(setStatuts, v)}
          onClear={() => { setStatuts([]); setPage(0) }}
        />
        <MultiSelectDropdown
          label="Région"
          options={REGION_OPTIONS.map(r => ({ value: r, label: r }))}
          selected={regions}
          onToggle={v => toggleFilter(setRegions, v)}
          onClear={() => { setRegions([]); setPage(0) }}
        />
        <MultiSelectDropdown
          label="Nature"
          options={NATURE_OPTIONS.map(n => ({ value: n, label: n }))}
          selected={natures}
          onToggle={v => toggleFilter(setNatures, v)}
          onClear={() => { setNatures([]); setPage(0) }}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setStatuts([]); setRegions([]); setNatures([]); setPage(0) }}
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
