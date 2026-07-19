"use client"
import { useState, useEffect } from "react"
import AppLayout from "@/components/AppLayout"
import { profileApi, type BusinessProfile } from "@/api/profile"
import { alertRecipientsApi, type AlertRecipient } from "@/api/alerts"
import { getAccessToken } from "@/context/AuthContext"
import {
  SECTOR_TREE, sectorLabel, categoryLabel, CONTRACT_TYPE_OPTIONS, REGION_OPTIONS,
  type SectorCategory,
} from "@/lib/businessProfileOptions"

interface FormState {
  name: string
  sector: string[]
  contract_type: string[]
  expertise: string[]
  region: string[]
  size: number | ""
  budget_min: number | ""
  budget_max: number | ""
}

function toForm(p: BusinessProfile): FormState {
  return {
    name: p.name,
    sector: p.sector,
    contract_type: p.contract_type,
    expertise: p.expertise,
    region: p.region,
    size: p.size,
    budget_min: p.budget_min,
    budget_max: p.budget_max,
  }
}

const fmtMoney = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })

const CARD: React.CSSProperties = {
  background: "white", border: "1.5px solid #dce8e8", borderRadius: 14,
  padding: "24px 28px", marginBottom: 20,
}
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "#1b2a4a", marginBottom: 14,
}
const INPUT: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #dce8e8", borderRadius: 10,
  fontSize: 14, fontFamily: "inherit", color: "#1b2a4a", background: "white", outline: "none",
}
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600, color: "#4a6a6a", marginBottom: 6,
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px", border: active ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
    borderRadius: 50, fontSize: 13, fontFamily: "inherit", fontWeight: active ? 600 : 400,
    color: active ? "#00B3A9" : "#4a6a6a", background: active ? "rgba(0,179,169,0.08)" : "white",
    cursor: "pointer", transition: "all 0.15s",
  }
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={chipStyle(active)}>
      {label}
    </button>
  )
}

// Own resource (alert_recipients), independent of the business-profile
// edit flow above — every account has exactly one is_default=true row
// (see ensure_default_recipient in app/services/alert.py), and PATCHing
// its email is reachable by any authenticated user regardless of PRO
// status (see the comment on app/routers/alert_recipient.py).
function DefaultRecipientCard() {
  const [recipient, setRecipient] = useState<AlertRecipient | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { setLoading(false); return }
    alertRecipientsApi.list(token)
      .then(rs => setRecipient(rs.find(r => r.is_default) ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !recipient) return null

  const startEdit = () => { setEmail(recipient.email); setError(""); setSaved(false); setEditing(true) }

  const save = async () => {
    const token = getAccessToken()
    if (!token) { setError("Session expirée. Veuillez vous reconnecter."); return }
    if (!email.trim()) { setError("L'adresse courriel est requise."); return }
    setSaving(true)
    setError("")
    try {
      const updated = await alertRecipientsApi.update(recipient.id, { email: email.trim() }, token)
      setRecipient(updated)
      setEditing(false)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={CARD}>
      <div style={SECTION_TITLE}>Courriel des alertes</div>
      <p style={{ fontSize: 12.5, color: "#8ba5a5", marginBottom: 12, lineHeight: 1.5 }}>
        L'adresse qui reçoit vos alertes par défaut, y compris l'alerte « Mon profil d'entreprise ».
      </p>
      {saved && !editing && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", marginBottom: 10, color: "#15803d", fontSize: 12.5 }}>
          Courriel mis à jour.
        </div>
      )}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 10, color: "#b91c1c", fontSize: 12.5 }}>
          {error}
        </div>
      )}
      {editing ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...INPUT, flex: "1 1 240px", width: "auto" }}
          />
          <button
            type="button" onClick={save} disabled={saving}
            style={{ padding: "9px 18px", background: saving ? "#8ba5a5" : "#00B3A9", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          <button
            type="button" onClick={() => setEditing(false)} disabled={saving}
            style={{ padding: "9px 18px", background: "white", border: "1.5px solid #dce8e8", borderRadius: 10, color: "#4a6a6a", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
          >
            Annuler
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, color: "#1b2a4a", fontWeight: 600 }}>{recipient.email}</span>
          <button
            type="button" onClick={startEdit}
            style={{ padding: "5px 14px", border: "1.5px solid #dce8e8", borderRadius: 8, background: "white", fontSize: 12, fontWeight: 600, color: "#4a6a6a", cursor: "pointer", fontFamily: "inherit" }}
          >
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileContent() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    const token = getAccessToken()
    if (!token) {
      setError("Session expirée. Veuillez vous reconnecter.")
      setLoading(false)
      return
    }
    profileApi.getMe(token)
      .then(p => { if (!cancelled) setProfile(p) })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const startEdit = () => {
    if (!profile) return
    setForm(toForm(profile))
    setSaveError("")
    setSaved(false)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm(null)
    setSaveError("")
  }

  const availableCategories: SectorCategory[] = []
  if (form) {
    const seen = new Set<string>()
    for (const s of SECTOR_TREE) {
      if (!form.sector.includes(s.descriptionFr)) continue
      for (const c of s.categories) {
        if (!seen.has(c.descriptionFr)) { seen.add(c.descriptionFr); availableCategories.push(c) }
      }
    }
  }

  const toggle = (field: "sector" | "contract_type" | "expertise" | "region", value: string) => {
    setForm(f => {
      if (!f) return f
      const next = f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value]
      if (field === "sector") {
        const allowed = new Set<string>()
        for (const s of SECTOR_TREE) {
          if (!next.includes(s.descriptionFr)) continue
          for (const c of s.categories) allowed.add(c.descriptionFr)
        }
        return { ...f, sector: next, expertise: f.expertise.filter(e => allowed.has(e)) }
      }
      return { ...f, [field]: next }
    })
  }

  const validate = (f: FormState): string => {
    if (!f.name.trim()) return "Le nom de l'entreprise est requis."
    if (f.sector.length === 0) return "Sélectionnez au moins un secteur."
    if (f.contract_type.length === 0) return "Sélectionnez au moins un type de contrat."
    if (f.expertise.length === 0) return "Sélectionnez au moins un domaine d'expertise."
    if (f.region.length === 0) return "Sélectionnez au moins une région."
    if (!f.size || Number(f.size) <= 0) return "Veuillez indiquer le nombre d'employés."
    if (f.budget_min === "" || Number(f.budget_min) < 0) return "Budget minimum invalide."
    if (f.budget_max === "" || Number(f.budget_max) <= Number(f.budget_min))
      return "Le budget maximum doit être supérieur au minimum."
    return ""
  }

  const save = async () => {
    if (!form) return
    const err = validate(form)
    if (err) { setSaveError(err); return }
    const token = getAccessToken()
    if (!token) { setSaveError("Session expirée. Veuillez vous reconnecter."); return }

    setSaving(true)
    setSaveError("")
    try {
      const updated = await profileApi.updateMe({
        name: form.name.trim(),
        sector: form.sector,
        contract_type: form.contract_type,
        expertise: form.expertise,
        region: form.region,
        size: Number(form.size),
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
      }, token)
      setProfile(updated)
      setEditing(false)
      setForm(null)
      setSaved(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif", maxWidth: 760 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px", marginBottom: 4 }}>
            Mon profil d'entreprise
          </h1>
          <p style={{ fontSize: 14, color: "#4a6a6a" }}>
            Ces informations déterminent les contrats qui vous sont recommandés.
          </p>
        </div>
        {!loading && !error && profile && !editing && (
          <button
            type="button"
            onClick={startEdit}
            style={{
              padding: "10px 20px", background: "#00B3A9", border: "none", borderRadius: 10,
              color: "white", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Modifier
          </button>
        )}
      </div>

      {saved && !editing && (
        <div style={{
          background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10,
          padding: "11px 15px", marginBottom: 20, color: "#15803d", fontSize: 13.5, fontWeight: 500,
        }}>
          Profil mis à jour avec succès.
        </div>
      )}

      {error ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "20px 24px", color: "#b91c1c", fontSize: 14 }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 90, borderRadius: 14, background: "#f0f4f4" }} />
          ))}
        </div>
      ) : !profile ? null : !editing ? (
        /* ── View mode ───────────────────────────────────────────── */
        <>
          <div style={CARD}>
            <div style={SECTION_TITLE}>Entreprise</div>
            <p style={{ fontSize: 15, color: "#1b2a4a", fontWeight: 600 }}>{profile.name}</p>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Secteurs d'activité</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.sector.map(s => (
                <span key={s} style={chipStyle(true)}>{sectorLabel(s)}</span>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Domaines d'expertise</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.expertise.map(e => (
                <span key={e} style={chipStyle(true)}>{categoryLabel(e)}</span>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Types de contrats</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {profile.contract_type.map(t => (
                <span key={t} style={{ fontSize: 13.5, color: "#1b2a4a" }}>• {t}</span>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Régions d'opération</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.region.map(r => (
                <span key={r} style={chipStyle(true)}>{r}</span>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Taille et budget</div>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div>
                <div style={LABEL}>Employés</div>
                <div style={{ fontSize: 15, color: "#1b2a4a", fontWeight: 600 }}>{profile.size}</div>
              </div>
              <div>
                <div style={LABEL}>Budget des contrats visés</div>
                <div style={{ fontSize: 15, color: "#1b2a4a", fontWeight: 600 }}>
                  {fmtMoney(profile.budget_min)} – {fmtMoney(profile.budget_max)}
                </div>
              </div>
            </div>
          </div>

          <DefaultRecipientCard />
        </>
      ) : form && (
        /* ── Edit mode ───────────────────────────────────────────── */
        <>
          {saveError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "11px 15px", marginBottom: 18, color: "#b91c1c", fontSize: 13, lineHeight: 1.5 }}>
              {saveError}
            </div>
          )}

          <div style={CARD}>
            <div style={SECTION_TITLE}>Entreprise</div>
            <label style={LABEL}>Nom de l'entreprise</label>
            <input
              value={form.name}
              onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))}
              style={INPUT}
            />
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Secteurs d'activité</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SECTOR_TREE.map(s => (
                <Chip
                  key={s.id}
                  label={sectorLabel(s.descriptionFr)}
                  active={form.sector.includes(s.descriptionFr)}
                  onClick={() => toggle("sector", s.descriptionFr)}
                />
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Domaines d'expertise</div>
            {availableCategories.length === 0 ? (
              <p style={{ fontSize: 13, color: "#8ba5a5" }}>Sélectionnez d'abord un secteur d'activité.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                {availableCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle("expertise", c.descriptionFr)}
                    style={{
                      ...chipStyle(form.expertise.includes(c.descriptionFr)),
                      borderRadius: 10, textAlign: "left", lineHeight: 1.4, whiteSpace: "normal",
                    }}
                  >
                    {categoryLabel(c.descriptionFr)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Types de contrats</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
              {CONTRACT_TYPE_OPTIONS.map(opt => {
                const active = form.contract_type.includes(opt)
                return (
                  <label
                    key={opt}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px",
                      border: active ? "1.5px solid #00B3A9" : "1.5px solid #dce8e8", borderRadius: 10,
                      cursor: "pointer", background: active ? "rgba(0,179,169,0.06)" : "white",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle("contract_type", opt)}
                      style={{ marginTop: 3, accentColor: "#00B3A9", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, color: "#1b2a4a", lineHeight: 1.5 }}>{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Régions d'opération</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {REGION_OPTIONS.map(r => (
                <Chip key={r} label={r} active={form.region.includes(r)} onClick={() => toggle("region", r)} />
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION_TITLE}>Taille et budget</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={LABEL}>Nombre d'employés</label>
                <input
                  type="number" min={1} max={10000}
                  value={form.size}
                  onChange={e => setForm(f => f && ({ ...f, size: e.target.value === "" ? "" : Number(e.target.value) }))}
                  style={INPUT}
                />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL}>Budget minimum (CAD $)</label>
                  <input
                    type="number" min={0}
                    value={form.budget_min}
                    onChange={e => setForm(f => f && ({ ...f, budget_min: e.target.value === "" ? "" : Number(e.target.value) }))}
                    style={INPUT}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL}>Budget maximum (CAD $)</label>
                  <input
                    type="number" min={0}
                    value={form.budget_max}
                    onChange={e => setForm(f => f && ({ ...f, budget_max: e.target.value === "" ? "" : Number(e.target.value) }))}
                    style={INPUT}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                padding: "12px 26px", background: saving ? "#8ba5a5" : "#00B3A9", border: "none", borderRadius: 10,
                color: "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              style={{
                padding: "12px 26px", background: "white", border: "1.5px solid #dce8e8", borderRadius: 10,
                color: "#4a6a6a", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AppLayout>
      <ProfileContent />
    </AppLayout>
  )
}
