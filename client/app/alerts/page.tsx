"use client"
import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import UpgradeGate from "@/components/UpgradeGate"
import { ExplorerFilterBar, useDebounced, type ExplorerFilterBarState } from "@/components/ExplorerFilterBar"
import { contractApi, type ExplorerFacets } from "@/api/contract"
import {
  alertsApi, alertRecipientsApi,
  type AlertEntry, type AlertFilters, type AlertFrequency, type AlertRecipient,
} from "@/api/alerts"
import { getAccessToken, useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/Toast"

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  per_run: "En temps réel",
  daily: "Quotidienne",
  weekly: "Hebdomadaire",
}

function filtersToBarState(filters: AlertFilters): ExplorerFilterBarState {
  return {
    statuts: filters.statut ?? [],
    regions: filters.region ?? [],
    natures: filters.nature_contrat ?? [],
    categories: filters.categorie ?? [],
    organisations: filters.organisation ?? [],
    closingWithin: filters.closing_within ?? null,
    sort: "date_fermeture", // AlertFilters has no sort field — showSort=false hides it, this is unused
    matchProfil: filters.match === "profil",
  }
}

function barStateToFilters(state: ExplorerFilterBarState): AlertFilters {
  const filters: AlertFilters = {}
  if (state.statuts.length) filters.statut = state.statuts
  if (state.regions.length) filters.region = state.regions
  if (state.natures.length) filters.nature_contrat = state.natures
  if (state.categories.length) filters.categorie = state.categories
  if (state.organisations.length) filters.organisation = state.organisations
  // Deliberately no closing_within — not a meaningful filter for a
  // recurring alert (it's evaluated fresh every time the matching engine
  // runs, not "at creation time" the way it works for a one-off
  // Explorateur search); see showClosingWithin={false} below.
  if (state.matchProfil) filters.match = "profil"
  return filters
}

function summarizeFilters(filters: AlertFilters): string[] {
  const chips: string[] = []
  if (filters.match === "profil") chips.push("Compatible profil")
  filters.statut?.forEach(v => chips.push(v))
  filters.region?.forEach(v => chips.push(v))
  filters.nature_contrat?.forEach(v => chips.push(v))
  filters.categorie?.forEach(v => chips.push(v))
  filters.organisation?.forEach(v => chips.push(v))
  return chips
}

function urlToFilters(searchParams: URLSearchParams): AlertFilters {
  // Deliberately no `q` here — a free-text keyword filter is too generic
  // for a recurring alert (see AlertForm below, which dropped the field
  // entirely), so a `q` present in the Explorateur URL that triggered
  // "Créer une alerte" is not carried over.
  const filters: AlertFilters = {}
  const statut = searchParams.getAll("statut"); if (statut.length) filters.statut = statut
  const region = searchParams.getAll("region"); if (region.length) filters.region = region
  const nature = searchParams.getAll("nature_contrat"); if (nature.length) filters.nature_contrat = nature
  const categorie = searchParams.getAll("categorie"); if (categorie.length) filters.categorie = categorie
  const organisation = searchParams.getAll("organisation"); if (organisation.length) filters.organisation = organisation
  // No closing_within either — see barStateToFilters above.
  if (searchParams.get("match") === "profil") filters.match = "profil"
  return filters
}

// ── Alert form (create + edit, shared) ───────────────────────────────────
function AlertForm({
  existing, initialFilters, isEnterprise, recipients, onCancel, onSaved,
}: {
  existing?: AlertEntry
  initialFilters?: AlertFilters
  isEnterprise: boolean
  recipients: AlertRecipient[]
  onCancel: () => void
  onSaved: () => void
}) {
  const isSystem = existing?.is_system ?? false
  const seedFilters = existing?.filters ?? initialFilters ?? {}

  const [name, setName] = useState(existing?.name ?? "")
  const [barState, setBarState] = useState<ExplorerFilterBarState>(() => filtersToBarState(seedFilters))
  const [frequency, setFrequency] = useState<AlertFrequency>(existing?.frequency ?? "daily")
  // "HH:MM" for the <input type="time">; existing.send_time comes back as
  // "HH:MM:SS" from the API, trimmed to match. Required whenever frequency
  // isn't per_run — see app/schemas/alert.py's require_send_time validator.
  const [sendTime, setSendTime] = useState(existing?.send_time?.slice(0, 5) ?? "08:00")
  const [recipientIds, setRecipientIds] = useState<number[]>(
    existing?.recipients.filter(r => !r.is_default).map(r => r.id) ?? [],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<{ count: number; is_broad: boolean } | null>(null)
  const [facets, setFacets] = useState<ExplorerFacets | null>(null)

  const filters = barStateToFilters(barState)
  const debouncedFiltersJson = useDebounced(JSON.stringify(filters), 400)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    alertsApi.preview(JSON.parse(debouncedFiltersJson), token)
      .then(res => { if (!cancelled) setPreview(res) })
      .catch(() => { if (!cancelled) setPreview(null) })
    return () => { cancelled = true }
  }, [debouncedFiltersJson])

  // Powers the Statut/Région/Nature/Catégorie dropdown *options* — without
  // this, ExplorerFilterBar has no facets prop here and every dropdown is
  // empty (nothing to click). Reuses the exact same search endpoint (and
  // its facets, ignoring the contract list itself — limit:1) the
  // Explorateur already relies on, so counts stay accurate as filters
  // narrow, instead of a hardcoded/stale option list.
  useEffect(() => {
    const token = getAccessToken()
    let cancelled = false
    contractApi.search_contracts({ ...JSON.parse(debouncedFiltersJson), limit: 1 }, token ?? undefined)
      .then(res => { if (!cancelled) setFacets(res.facets) })
      .catch(() => { if (!cancelled) setFacets(null) })
    return () => { cancelled = true }
  }, [debouncedFiltersJson])

  function toggleRecipient(id: number) {
    setRecipientIds(ids => (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]))
  }

  async function handleSubmit() {
    if (!isSystem && !name.trim()) { setError("Le nom de l'alerte est requis."); return }
    if (frequency !== "per_run" && !sendTime) { setError("L'heure d'envoi est requise pour cette fréquence."); return }
    const token = getAccessToken()
    if (!token) { setError("Session expirée. Veuillez vous reconnecter."); return }
    const send_time = frequency === "per_run" ? null : sendTime
    setSaving(true)
    setError("")
    try {
      if (existing) {
        await alertsApi.update(existing.id, {
          ...(isSystem ? {} : { name: name.trim() }),
          filters, frequency, send_time,
          recipient_ids: recipientIds,
        }, token)
      } else {
        await alertsApi.create({ name: name.trim(), filters, frequency, send_time, recipient_ids: recipientIds }, token)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 14, padding: "22px 24px", marginBottom: 16 }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      {!isSystem && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a6a6a", marginBottom: 6 }}>Nom de l'alerte</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex. Contrats TI à Montréal"
            style={{ width: "100%", maxWidth: 420, padding: "10px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
      )}

      {isSystem && (
        <div style={{ padding: "10px 14px", background: "#f7fafa", border: "1.5px dashed #dce8e8", borderRadius: 10, fontSize: 12.5, color: "#4a6a6a", marginBottom: 12 }}>
          Ces filtres ont été initialisés à partir de votre profil d'entreprise, mais restent entièrement modifiables.
        </div>
      )}
      <ExplorerFilterBar
        state={barState}
        setStatuts={v => setBarState(s => ({ ...s, statuts: typeof v === "function" ? v(s.statuts) : v }))}
        setRegions={v => setBarState(s => ({ ...s, regions: typeof v === "function" ? v(s.regions) : v }))}
        setNatures={v => setBarState(s => ({ ...s, natures: typeof v === "function" ? v(s.natures) : v }))}
        setCategories={v => setBarState(s => ({ ...s, categories: typeof v === "function" ? v(s.categories) : v }))}
        setOrganisations={v => setBarState(s => ({ ...s, organisations: typeof v === "function" ? v(s.organisations) : v }))}
        setClosingWithin={v => setBarState(s => ({ ...s, closingWithin: typeof v === "function" ? v(s.closingWithin) : v }))}
        setSort={() => {}}
        setMatchProfil={v => setBarState(s => ({ ...s, matchProfil: typeof v === "function" ? v(s.matchProfil) : v }))}
        showSort={false}
        showClosingWithin={false}
        facets={facets}
      />

      {preview && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16,
          padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          color: preview.is_broad ? "#b45309" : "#00786f",
          background: preview.is_broad ? "#fef3c7" : "rgba(0,179,169,0.08)",
        }}>
          ≈ {preview.count.toLocaleString("fr-CA")} avis / mois
          {preview.is_broad && " — filtre très large, envisagez de le préciser"}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a6a6a", marginBottom: 6 }}>Fréquence</label>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as AlertFrequency)}
            style={{ padding: "9px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", cursor: "pointer" }}
          >
            {(Object.keys(FREQUENCY_LABELS) as AlertFrequency[]).map(f => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </div>

        {frequency !== "per_run" && (
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a6a6a", marginBottom: 6 }}>
              Heure d'envoi
            </label>
            <input
              type="time"
              value={sendTime}
              onChange={e => setSendTime(e.target.value)}
              style={{ padding: "9px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit" }}
            />
          </div>
        )}

        {isEnterprise && (
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a6a6a", marginBottom: 6 }}>Destinataires</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recipients.map(r => {
                const active = r.is_default || recipientIds.includes(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={r.is_default}
                    onClick={() => toggleRecipient(r.id)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontFamily: "inherit", fontWeight: 600,
                      border: active ? "1.5px solid #00B3A9" : "1.5px solid #dce8e8",
                      background: active ? "rgba(0,179,169,0.08)" : "white",
                      color: active ? "#00786f" : "#4a6a6a",
                      cursor: r.is_default ? "default" : "pointer",
                    }}
                  >
                    {r.email}{r.is_default ? " (défaut)" : ""}{!r.is_verified ? " · en attente" : ""}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button" onClick={handleSubmit} disabled={saving}
          style={{ padding: "10px 22px", background: saving ? "#8ba5a5" : "#00B3A9", color: "white", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Enregistrement…" : existing ? "Enregistrer" : "Créer l'alerte"}
        </button>
        <button
          type="button" onClick={onCancel} disabled={saving}
          style={{ padding: "10px 22px", background: "white", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ── Recipients management (enterprise only) ──────────────────────────────
function RecipientsManager({ recipients, onChange }: { recipients: AlertRecipient[]; onChange: () => void }) {
  const [email, setEmail] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState("")
  const [adding, setAdding] = useState(false)
  const { showToast } = useToast()

  const additional = recipients.filter(r => !r.is_default)

  function handleAdd() {
    const token = getAccessToken()
    if (!token) return
    setAdding(true)
    setError("")
    alertRecipientsApi.create({ email, label: label || undefined }, token)
      .then(() => { setEmail(""); setLabel(""); onChange() })
      .catch(e => setError(e instanceof Error ? e.message : "Erreur."))
      .finally(() => setAdding(false))
  }

  function handleRemove(id: number) {
    const token = getAccessToken()
    if (!token) return
    alertRecipientsApi.remove(id, token).then(onChange).catch(() => showToast("Impossible de retirer ce destinataire."))
  }

  return (
    <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 14, padding: "18px 22px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {recipients.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #eef4f4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, color: "#1b2a4a", fontWeight: 600 }}>{r.email}</span>
              {r.label && <span style={{ fontSize: 12, color: "#8ba5a5" }}>{r.label}</span>}
              {r.is_default && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#e6f7f6", color: "#009991" }}>PAR DÉFAUT</span>
              )}
              {!r.is_verified && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#fef3c7", color: "#b45309" }}>EN ATTENTE DE VÉRIFICATION</span>
              )}
            </div>
            {!r.is_default && (
              <button
                type="button" onClick={() => handleRemove(r.id)}
                style={{ border: "none", background: "none", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <div style={{ color: "#b91c1c", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {additional.length < 5 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={email} onChange={e => setEmail(e.target.value)} placeholder="courriel@exemple.com"
            style={{ flex: "1 1 200px", padding: "8px 12px", border: "1.5px solid #dce8e8", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
          />
          <input
            value={label} onChange={e => setLabel(e.target.value)} placeholder="Étiquette (optionnel)"
            style={{ flex: "0 1 160px", padding: "8px 12px", border: "1.5px solid #dce8e8", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
          />
          <button
            type="button" onClick={handleAdd} disabled={adding || !email}
            style={{ padding: "8px 16px", background: "#00B3A9", border: "none", borderRadius: 8, color: "white", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: adding ? "wait" : "pointer" }}
          >
            Ajouter
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: "#8ba5a5" }}>Maximum 5 destinataires additionnels atteint.</p>
      )}
    </div>
  )
}

function AlertsContent() {
  const searchParams = useSearchParams()
  const { subscription } = useAuth()
  const { showToast } = useToast()

  const [alerts, setAlerts] = useState<AlertEntry[]>([])
  const [recipients, setRecipients] = useState<AlertRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [previews, setPreviews] = useState<Record<number, number>>({})
  const [creating, setCreating] = useState(() => searchParams.get("create") === "1")
  const [editingId, setEditingId] = useState<number | null>(null)

  const isEnterprise = subscription === "enterprise"

  const loadAll = useCallback(() => {
    const token = getAccessToken()
    if (!token) { setError("Session expirée. Veuillez vous reconnecter."); setLoading(false); return }
    setLoading(true)
    setError("")
    Promise.all([alertsApi.list(token), alertRecipientsApi.list(token)])
      .then(([alertsRes, recipientsRes]) => {
        setAlerts(alertsRes.items)
        setRecipients(recipientsRes)
      })
      .catch(e => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // 30-day match counts for the "≈ X avis/mois" column on each existing alert.
  useEffect(() => {
    if (alerts.length === 0) return
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    Promise.all(alerts.map(a =>
      alertsApi.preview(a.filters, token).then(res => [a.id, res.count] as const).catch(() => [a.id, 0] as const),
    )).then(pairs => { if (!cancelled) setPreviews(Object.fromEntries(pairs)) })
    return () => { cancelled = true }
  }, [alerts])

  function handleToggleActive(alert: AlertEntry) {
    const token = getAccessToken()
    if (!token) return
    const previous = alert.is_active
    setAlerts(as => as.map(a => (a.id === alert.id ? { ...a, is_active: !previous } : a)))
    alertsApi.update(alert.id, { is_active: !previous }, token).catch(() => {
      setAlerts(as => as.map(a => (a.id === alert.id ? { ...a, is_active: previous } : a)))
      showToast("Impossible de mettre à jour l'alerte. Réessayez.")
    })
  }

  function handleDelete(alert: AlertEntry) {
    const token = getAccessToken()
    if (!token) return
    setAlerts(as => as.filter(a => a.id !== alert.id))
    alertsApi.remove(alert.id, token)
      .then(() => showToast(`Alerte « ${alert.name} » supprimée.`))
      .catch(() => {
        setAlerts(as => [...as, alert])
        showToast("Impossible de supprimer l'alerte. Réessayez.")
      })
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px", marginBottom: 4 }}>Alertes</h1>
          <p style={{ fontSize: 14, color: "#4a6a6a" }}>
            Recevez un courriel dès qu'un nouvel avis correspond à vos critères.
          </p>
        </div>
        {!creating && (
          <button
            type="button" onClick={() => setCreating(true)}
            style={{ padding: "10px 20px", background: "#00B3A9", border: "none", borderRadius: 10, color: "white", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}
          >
            + Créer une alerte
          </button>
        )}
      </div>

      {creating && (
        <AlertForm
          initialFilters={urlToFilters(new URLSearchParams(searchParams.toString()))}
          isEnterprise={isEnterprise}
          recipients={recipients}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); loadAll(); showToast("Alerte créée.") }}
        />
      )}

      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "20px 24px", color: "#b91c1c", fontSize: 14 }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 14, background: "#f0f4f4" }} />
          ))}
        </div>
      ) : alerts.length === 0 && !creating ? (
        <div style={{ textAlign: "center", padding: "64px 32px", border: "1.5px dashed #dce8e8", borderRadius: 14, color: "#8ba5a5", fontSize: 14 }}>
          Aucune alerte pour l'instant.
          <div style={{ marginTop: 10 }}>
            Une alerte « Mon profil d'entreprise » a déjà été créée automatiquement pour vous (désactivée par défaut) —
            activez-la depuis <Link href="/profile" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>votre profil</Link>{" "}
            une fois qu'elle apparaît ici, ou créez-en une nouvelle ci-dessus.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map(alert => editingId === alert.id ? (
            <AlertForm
              key={alert.id}
              existing={alert}
              isEnterprise={isEnterprise}
              recipients={recipients}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); loadAll() }}
            />
          ) : (
            <div key={alert.id} style={{
              background: alert.is_active ? "white" : "#fbfbfb",
              border: alert.is_active ? "1.5px solid #dce8e8" : "1.5px dashed #c0d4d4",
              borderRadius: 14, padding: "18px 22px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240, opacity: alert.is_active ? 1 : 0.6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#1b2a4a" }}>{alert.name}</span>
                    {alert.is_system && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#e6f7f6", color: "#009991", letterSpacing: 0.5 }}>
                        SYSTÈME
                      </span>
                    )}
                    {!alert.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#f3f4f6", color: "#6b7280", letterSpacing: 0.5 }}>
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {summarizeFilters(alert.filters).length === 0 ? (
                      <span style={{ fontSize: 11.5, color: "#8ba5a5" }}>Tous les avis ouverts</span>
                    ) : summarizeFilters(alert.filters).map((chip, i) => (
                      <span key={i} style={{ fontSize: 11.5, color: "#4a6a6a", background: "#f7fafa", padding: "3px 10px", borderRadius: 20 }}>
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#8ba5a5", flexWrap: "wrap" }}>
                    <span>
                      {FREQUENCY_LABELS[alert.frequency]}
                      {alert.frequency !== "per_run" && alert.send_time && ` à ${alert.send_time.slice(0, 5)}`}
                    </span>
                    <span>·</span>
                    <span>{alert.recipients.map(r => r.email).join(", ") || "Aucun destinataire"}</span>
                    <span>·</span>
                    <span>≈ {(previews[alert.id] ?? 0).toLocaleString("fr-CA")} avis / mois</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox" checked={alert.is_active} onChange={() => handleToggleActive(alert)}
                      style={{ accentColor: "#00B3A9", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: alert.is_active ? "#15803d" : "#6b7280" }}>
                      {alert.is_active ? "Active" : "Désactivée"}
                    </span>
                  </label>
                  <button
                    type="button" onClick={() => setEditingId(alert.id)}
                    style={{ padding: "6px 12px", border: "1.5px solid #dce8e8", borderRadius: 8, background: "white", fontSize: 12, fontWeight: 600, color: "#4a6a6a", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Éditer
                  </button>
                  {!alert.is_system && (
                    <button
                      type="button" onClick={() => handleDelete(alert)}
                      style={{ padding: "6px 12px", border: "1.5px solid #fecaca", borderRadius: 8, background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && isEnterprise && (
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1b2a4a", marginBottom: 12 }}>Destinataires</h2>
          <RecipientsManager recipients={recipients} onChange={loadAll} />
        </div>
      )}
    </div>
  )
}

function AlertsFallback() {
  return (
    <div style={{ padding: "32px 32px 64px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 90, borderRadius: 14, background: "#f0f4f4" }} />
        ))}
      </div>
    </div>
  )
}

export default function AlertsPage() {
  return (
    <AppLayout>
      <UpgradeGate
        feature="Alertes en temps réel"
        description="Passez à Pro pour être notifié par courriel dès qu'un nouvel avis correspond à vos critères — plus besoin de revenir vérifier l'Explorateur chaque jour."
        benefits={[
          "Alertes illimitées (jusqu'à 10) sur vos propres critères de recherche",
          "Fréquence quotidienne, hebdomadaire ou à chaque exécution",
          "Alerte « Mon profil d'entreprise » créée automatiquement",
        ]}
      >
        <Suspense fallback={<AlertsFallback />}>
          <AlertsContent />
        </Suspense>
      </UpgradeGate>
    </AppLayout>
  )
}
