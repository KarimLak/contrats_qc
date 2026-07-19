"use client"
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { contractApi, type ExplorerFacets, type ExplorerSort, type OrganisationSuggestion } from "@/api/contract"

// Extracted verbatim from client/app/explorer/page.tsx so the Explorateur
// listing and the Alertes create/edit form (which needs the exact same
// filter set — see AlertFilters in app/schemas/alert.py) share one
// implementation instead of two that can drift apart.

export const SORT_OPTIONS: { value: ExplorerSort; label: string }[] = [
  { value: "date_fermeture", label: "Date de fermeture (urgent d'abord)" },
  { value: "date_publication", label: "Date de publication (récent d'abord)" },
  { value: "pertinence", label: "Pertinence" },
]

export const CLOSING_WITHIN_OPTIONS: { value: number | null; label: string }[] = [
  { value: 7, label: "7 jours" },
  { value: 14, label: "14 jours" },
  { value: 30, label: "30 jours" },
  { value: null, label: "Tous" },
]

const SEARCH_DEBOUNCE_MS = 300

// A value picked from the URL (deep link) or from a stale facet list might
// not appear in the live facet counts (e.g. it now matches 0 results given
// the other active filters) — keep it selectable/visible anyway with a
// count of 0 rather than letting it silently vanish from the checkbox list
// while still being applied as an active filter.
export function mergeFacetOptions(
  facetOptions: { value: string; count: number }[], selected: string[],
): { value: string; count: number }[] {
  const known = new Set(facetOptions.map(o => o.value))
  const missing = selected.filter(v => !known.has(v)).map(v => ({ value: v, count: 0 }))
  return [...facetOptions, ...missing]
}

export function useDebounced<T>(value: T, delayMs: number): T {
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

export interface ExplorerFilterBarState {
  statuts: string[]
  regions: string[]
  natures: string[]
  categories: string[]
  organisations: string[]
  closingWithin: number | null
  sort: ExplorerSort
  matchProfil: boolean
}

export interface ExplorerFilterBarProps {
  state: ExplorerFilterBarState
  setStatuts: Dispatch<SetStateAction<string[]>>
  setRegions: Dispatch<SetStateAction<string[]>>
  setNatures: Dispatch<SetStateAction<string[]>>
  setCategories: Dispatch<SetStateAction<string[]>>
  setOrganisations: Dispatch<SetStateAction<string[]>>
  setClosingWithin: Dispatch<SetStateAction<number | null>>
  setSort: Dispatch<SetStateAction<ExplorerSort>>
  setMatchProfil: Dispatch<SetStateAction<boolean>>
  facets?: ExplorerFacets | null
  // Explorer shows a sort dropdown in the bar; the Alertes filter form
  // doesn't (an alert's filters describe *what* matches, not *display
  // order* — see AlertFilters in app/schemas/alert.py, which has no
  // "sort" field), so this defaults to on and the alert form opts out.
  showSort?: boolean
  // Alerts fire on newly-arrived contracts matched at whatever moment the
  // matching engine runs — "closing within N days" is evaluated fresh each
  // run and doesn't mean "select contracts to alert on" the way it does for
  // a one-off Explorateur search, so the Alertes form opts out of it too.
  showClosingWithin?: boolean
  // Whether some OTHER filter the parent owns (Explorer's search box `q`,
  // which lives outside this component) is currently active — folded into
  // whether the "Réinitialiser" button shows at all.
  hasExtraActiveFilter?: boolean
  // The parent decides what "reset" means for its own extra state (e.g.
  // Explorer also clears `q`) — this component always resets its own
  // fields via the setters above, then calls this for anything else.
  onResetExtra?: () => void
}

export function ExplorerFilterBar({
  state, setStatuts, setRegions, setNatures, setCategories, setOrganisations,
  setClosingWithin, setSort, setMatchProfil, facets, showSort = true, showClosingWithin = true,
  hasExtraActiveFilter = false, onResetExtra,
}: ExplorerFilterBarProps) {
  const toggleFilter = (setter: Dispatch<SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  const hasFilters = state.statuts.length > 0 || state.regions.length > 0 || state.natures.length > 0
    || state.categories.length > 0 || state.organisations.length > 0
    || (showClosingWithin && state.closingWithin !== null)
    || state.matchProfil || hasExtraActiveFilter

  return (
    <div style={{
      background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
      padding: "16px 20px", marginBottom: 24,
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      <MultiSelectDropdown
        label="Statut"
        options={mergeFacetOptions(facets?.statut ?? [], state.statuts)}
        selected={state.statuts}
        onToggle={v => toggleFilter(setStatuts, v)}
        onClear={() => setStatuts([])}
      />
      <MultiSelectDropdown
        label="Région"
        options={mergeFacetOptions(facets?.region ?? [], state.regions)}
        selected={state.regions}
        onToggle={v => toggleFilter(setRegions, v)}
        onClear={() => setRegions([])}
      />
      <MultiSelectDropdown
        label="Nature"
        options={mergeFacetOptions(facets?.nature_contrat ?? [], state.natures)}
        selected={state.natures}
        onToggle={v => toggleFilter(setNatures, v)}
        onClear={() => setNatures([])}
      />
      <MultiSelectDropdown
        label="Catégorie"
        options={mergeFacetOptions(facets?.categorie ?? [], state.categories)}
        selected={state.categories}
        onToggle={v => toggleFilter(setCategories, v)}
        onClear={() => setCategories([])}
      />
      <OrganisationTypeahead
        selected={state.organisations}
        onAdd={name => setOrganisations(prev => [...prev, name])}
        onRemove={name => setOrganisations(prev => prev.filter(n => n !== name))}
      />
      {showClosingWithin && <ClosingWithinFilter value={state.closingWithin} onChange={setClosingWithin} />}
      {showSort && <SortDropdown value={state.sort} onChange={setSort} />}

      {state.matchProfil && (
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
            setStatuts([]); setRegions([]); setNatures([]); setCategories([])
            setOrganisations([]); setClosingWithin(null); setMatchProfil(false)
            onResetExtra?.()
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
  )
}
