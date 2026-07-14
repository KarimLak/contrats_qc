"use client"
import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

// Mirrors app/type/tender.py's TenderCategory values.
const CATEGORIE_OPTIONS = [
  "Aérospatiale", "Alimentation", "Ameublement", "Armement",
  "Communication, détection et fibres optiques", "Constructions préfabriquées",
  "Cosmétiques et articles de toilette", "Énergie",
  "Entretien d'équipement de bureau et d'informatique",
  "Équipement de lutte contre l'incendie, de sécurité et de protection",
  "Équipement de transport et pièces de rechange", "Équipement industriel",
  "Fourniture et équipement médicaux et produits pharmaceutiques",
  "Instruments scientifiques", "Intégration de systèmes", "Machinerie et outils",
  "Marine", "Matériaux de construction", "Matériel de bureau",
  "Matériel de climatisation et de réfrigération", "Matériel informatique et logiciel",
  "Moteurs, turbines, composants et accessoires connexes",
  "Papeterie et fournitures de bureau", "Préparation alimentaire et équipement de service",
  "Produits divers", "Produits électriques et électroniques",
  "Produits et spécialités chimiques", "Produits finis",
  "Publications, formulaires et articles en papier", "Textiles et vêtements",
  "Véhicules spéciaux", "Indéterminé", "Concession", "Partenariat",
  "Contrôle de la qualité, essais et inspections et services de représentants techniques",
  "Entretien, réparation, modification, réfection et installation de biens et d'équipement",
  "Études spéciales et analyses", "Exploitation des installations gouvernementales",
  "Location à bail ou location d'installations immobilières",
  "Location à bail/Location d'équipement", "Recherche et développement (R et D)",
  "Services d'architecture et d'ingénierie",
  "Services de communication, de photographie, de cartographie, d'impression et de publication",
  "Services de garde et autres services connexes", "Services de ressources naturelles",
  "Services de santé et services sociaux",
  "Services de soutien professionnel et administratif et services de soutien à la gestion",
  "Services de transport, de voyage et de déménagement", "Services environnementaux",
  "Services financiers et autres services connexes", "Services pédagogiques et formation",
  "Services publics", "Traitement de l'information et services de télécommunications connexes",
  "Autres travaux de construction", "Bâtiments", "Ouvrages de génie civil",
  "Vente de biens immeubles", "Vente de biens meubles",
]

// A categorie/region arriving via URL (e.g. from the analytics radar) might not
// be one of the options above if the taxonomy drifts - still include it so the
// filter actually applies, even if the dropdown can't show a friendly checkbox for it.
function withUrlValues(options: string[], fromUrl: string[]): string[] {
  const extra = fromUrl.filter(v => !options.includes(v))
  return extra.length ? [...options, ...extra] : options
}

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
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [page, setPage]           = useState(0)

  // Seeded once from the URL on mount (e.g. a deep link from the analytics
  // radar: /explorer?region=Laval&categorie=Services+de+garde...) - read only
  // in the initializer, not in an effect keyed on searchParams, so typing in
  // a filter here doesn't fight with the URL on every keystroke.
  const [statuts, setStatuts]     = useState<string[]>(() => searchParams.getAll("statut"))
  const [regions, setRegions]     = useState<string[]>(() => searchParams.getAll("region"))
  const [natures, setNatures]     = useState<string[]>(() => searchParams.getAll("nature_contrat"))
  const [categories, setCategories] = useState<string[]>(() => searchParams.getAll("categorie"))

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    const filter: Record<string, string[]> = {}
    if (statuts.length) filter.statut = statuts
    if (regions.length) filter.region = regions
    if (natures.length) filter.nature_contrat = natures
    if (categories.length) filter.categorie = categories

    contractApi.get_contracts(filter, page * PAGE_SIZE, PAGE_SIZE)
      .then(res => {
        if (cancelled) return
        setContracts(res.contracts ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [statuts, regions, natures, categories, page])

  // Keeps the URL in sync so the current filter selection stays bookmarkable/
  // shareable - a courtesy on top of the required read-on-mount above.
  useEffect(() => {
    const params = new URLSearchParams()
    statuts.forEach(v => params.append("statut", v))
    regions.forEach(v => params.append("region", v))
    natures.forEach(v => params.append("nature_contrat", v))
    categories.forEach(v => params.append("categorie", v))
    const query = params.toString()
    router.replace(query ? `/explorer?${query}` : "/explorer", { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuts, regions, natures, categories])

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    setPage(0)
  }

  const hasFilters = statuts.length > 0 || regions.length > 0 || natures.length > 0 || categories.length > 0

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
        <MultiSelectDropdown
          label="Catégorie"
          options={withUrlValues(CATEGORIE_OPTIONS, categories).map(c => ({ value: c, label: c }))}
          selected={categories}
          onToggle={v => toggleFilter(setCategories, v)}
          onClear={() => { setCategories([]); setPage(0) }}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setStatuts([]); setRegions([]); setNatures([]); setCategories([]); setPage(0) }}
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
