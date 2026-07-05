"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import PublicNav from "@/components/PublicNav"
import {
  SECTOR_TREE, sectorLabel, categoryLabel, CONTRACT_TYPE_OPTIONS, REGION_OPTIONS,
  type SectorCategory,
} from "@/lib/businessProfileOptions"

const TOTAL_STEPS = 8

const STEP_TITLES = [
  "Quel est votre courriel ?",
  "Sécurisez votre compte",
  "Votre entreprise",
  "Secteurs d'activité",
  "Types de contrats",
  "Domaines d'expertise",
  "Régions d'opération",
  "Taille et budget",
]

const STEP_SUBTITLES = [
  "L'adresse courriel qui sera associée à votre compte.",
  "Choisissez un identifiant et un mot de passe sécurisé.",
  "Comment s'appelle officiellement votre entreprise ?",
  "Sélectionnez les secteurs dans lesquels votre entreprise est active.",
  "Quels types de contrats souhaitez-vous recevoir ?",
  "Sélectionnez les domaines d'expertise liés à vos secteurs d'activité.",
  "Dans quelles régions du Québec opérez-vous ?",
  "Ces informations nous aident à calibrer les opportunités qui vous sont présentées.",
]

interface FormState {
  email: string
  username: string
  password: string
  business_name: string
  sector: string[]
  contract_type: string[]
  expertise: string[]
  region: string[]
  size: number | ""
  budget_min: number | ""
  budget_max: number | ""
}

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [animClass, setAnimClass] = useState("step-enter-next")
  const [form, setForm] = useState<FormState>({
    email: "",
    username: "",
    password: "",
    business_name: "",
    sector: [],
    contract_type: [],
    expertise: [],
    region: [],
    size: "",
    budget_min: "",
    budget_max: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100)

  // Domaines d'expertise disponibles : union (dédupliquée) des catégories des secteurs sélectionnés.
  const availableCategories: SectorCategory[] = []
  const seenCategories = new Set<string>()
  for (const s of SECTOR_TREE) {
    if (!form.sector.includes(s.descriptionFr)) continue
    for (const c of s.categories) {
      if (!seenCategories.has(c.descriptionFr)) {
        seenCategories.add(c.descriptionFr)
        availableCategories.push(c)
      }
    }
  }

  const validate = (): string => {
    switch (step) {
      case 0:
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
          return "Veuillez entrer une adresse courriel valide."
        return ""
      case 1:
        if (!form.username.trim()) return "Le nom d'utilisateur est requis."
        if (form.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères."
        return ""
      case 2:
        if (!form.business_name.trim()) return "Le nom de l'entreprise est requis."
        return ""
      case 3:
        if (form.sector.length === 0) return "Sélectionnez au moins un secteur."
        return ""
      case 4:
        if (form.contract_type.length === 0) return "Sélectionnez au moins un type de contrat."
        return ""
      case 5:
        if (form.expertise.length === 0) return "Ajoutez au moins une expertise."
        return ""
      case 6:
        if (form.region.length === 0) return "Sélectionnez au moins une région."
        return ""
      case 7:
        if (!form.size || Number(form.size) <= 0) return "Veuillez indiquer le nombre d'employés."
        if (form.budget_min === "" || Number(form.budget_min) < 0) return "Budget minimum invalide."
        if (form.budget_max === "" || Number(form.budget_max) <= Number(form.budget_min))
          return "Le budget maximum doit être supérieur au minimum."
        return ""
      default:
        return ""
    }
  }

  const goNext = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError("")

    if (step === TOTAL_STEPS - 1) {
      setLoading(true)
      try {
        await register(form.username, form.email, form.password, {
          name: form.business_name,
          sector: form.sector,
          contract_type: form.contract_type,
          expertise: form.expertise,
          region: form.region,
          size: Number(form.size),
          budget_min: Number(form.budget_min),
          budget_max: Number(form.budget_max),
        })
        router.push("/explorer")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la création du compte.")
        setLoading(false)
      }
    } else {
      setAnimClass("step-enter-next")
      setStep(s => s + 1)
    }
  }

  const goBack = () => {
    setError("")
    setAnimClass("step-enter-prev")
    setStep(s => s - 1)
  }

  const toggleMulti = (field: "sector" | "contract_type" | "expertise" | "region", value: string) => {
    setForm(f => {
      const next = f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value]

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

  const INPUT: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid #dce8e8",
    borderRadius: 10,
    fontSize: 15,
    fontFamily: "inherit",
    color: "#1b2a4a",
    background: "white",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  }

  const LABEL: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#1b2a4a",
    marginBottom: 8,
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <input
            type="email"
            autoFocus
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && goNext()}
            placeholder="vous@entreprise.ca"
            style={{ ...INPUT, fontSize: 17 }}
          />
        )

      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Nom d'utilisateur</label>
              <input
                autoFocus
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="votre_nom"
                style={INPUT}
              />
            </div>
            <div>
              <label style={LABEL}>
                Mot de passe
                <span style={{ fontSize: 11, color: "#8ba5a5", fontWeight: 400, marginLeft: 6 }}>
                  — 8 caractères minimum
                </span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && goNext()}
                placeholder="••••••••"
                style={INPUT}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <input
            autoFocus
            value={form.business_name}
            onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && goNext()}
            placeholder="Ex. : Construction Dupont inc."
            style={{ ...INPUT, fontSize: 17 }}
          />
        )

      case 3:
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SECTOR_TREE.map(s => {
              const active = form.sector.includes(s.descriptionFr)
              return (
                <button
                  key={s.id}
                  type="button"
                  className="chip-btn"
                  onClick={() => toggleMulti("sector", s.descriptionFr)}
                  style={{
                    padding: "9px 18px",
                    border: active ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
                    borderRadius: 50,
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#00B3A9" : "#4a6a6a",
                    background: active ? "rgba(0,179,169,0.08)" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {sectorLabel(s.descriptionFr)}
                </button>
              )
            })}
          </div>
        )

      case 4:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
            {CONTRACT_TYPE_OPTIONS.map(opt => {
              const active = form.contract_type.includes(opt)
              return (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 14px",
                    border: active ? "1.5px solid #00B3A9" : "1.5px solid #dce8e8",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: active ? "rgba(0,179,169,0.06)" : "white",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleMulti("contract_type", opt)}
                    style={{ marginTop: 3, accentColor: "#00B3A9", flexShrink: 0, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "#1b2a4a", lineHeight: 1.55 }}>{opt}</span>
                </label>
              )
            })}
          </div>
        )

      case 5:
        if (availableCategories.length === 0) {
          return (
            <p style={{ fontSize: 13, color: "#8ba5a5" }}>
              Veuillez d'abord sélectionner au moins un secteur d'activité à l'étape précédente.
            </p>
          )
        }
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {availableCategories.map(cat => {
              const active = form.expertise.includes(cat.descriptionFr)
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`expertise-card${active ? " active" : ""}`}
                  onClick={() => toggleMulti("expertise", cat.descriptionFr)}
                  style={{
                    padding: "14px 16px",
                    border: active ? "1.5px solid #00B3A9" : "1.5px solid #e4eeee",
                    borderRadius: 14,
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#00786f" : "#4a6a6a",
                    background: active
                      ? "linear-gradient(135deg, rgba(0,179,169,0.12), rgba(0,179,169,0.05))"
                      : "white",
                    boxShadow: active ? "0 2px 10px rgba(0,179,169,0.12)" : "0 1px 3px rgba(27,42,74,0.05)",
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.45,
                    whiteSpace: "normal",
                    transition: "all 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {active && (
                    <span
                      className="expertise-badge"
                      style={{
                        position: "absolute",
                        top: -7,
                        right: -7,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#00B3A9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,179,169,0.4)",
                      }}
                    >
                      <svg width="10" height="8" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  {categoryLabel(cat.descriptionFr)}
                </button>
              )
            })}
          </div>
        )

      case 6:
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, maxHeight: 340, overflowY: "auto" }}>
            {REGION_OPTIONS.map(opt => {
              const active = form.region.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  className="chip-btn"
                  onClick={() => toggleMulti("region", opt)}
                  style={{
                    padding: "9px 16px",
                    border: active ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
                    borderRadius: 50,
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#00B3A9" : "#4a6a6a",
                    background: active ? "rgba(0,179,169,0.08)" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        )

      case 7:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={LABEL}>Nombre d'employés</label>
              <input
                type="number"
                autoFocus
                min={1}
                max={10000}
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="Ex. : 25"
                style={INPUT}
              />
            </div>
            <div>
              <label style={LABEL}>Budget minimum des contrats (CAD $)</label>
              <input
                type="number"
                min={0}
                max={10000000}
                value={form.budget_min}
                onChange={e => setForm(f => ({ ...f, budget_min: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="Ex. : 50 000"
                style={INPUT}
              />
            </div>
            <div>
              <label style={LABEL}>Budget maximum des contrats (CAD $)</label>
              <input
                type="number"
                min={0}
                value={form.budget_max}
                onChange={e => setForm(f => ({ ...f, budget_max: e.target.value === "" ? "" : Number(e.target.value) }))}
                onKeyDown={e => e.key === "Enter" && goNext()}
                placeholder="Ex. : 500 000"
                style={INPUT}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', system-ui, sans-serif; background: #f7fafa; color: #1b2a4a; -webkit-font-smoothing: antialiased; }
        input[type="text"]:focus, input[type="email"]:focus, input[type="password"]:focus, input[type="number"]:focus {
          border-color: #00B3A9 !important;
          box-shadow: 0 0 0 3px rgba(0,179,169,0.12);
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-enter-next { animation: slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .step-enter-prev { animation: slideInLeft  0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .chip-btn:hover  { transform: scale(1.03); }
        .expertise-card { position: relative; }
        .expertise-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,179,169,0.14); border-color: #9fd6d2 !important; }
        .expertise-card.active:hover { box-shadow: 0 8px 20px rgba(0,179,169,0.22); }
        .expertise-badge { animation: badgePop 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #dce8e8; border-radius: 2px; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 1; }
        .next-btn:hover:not(:disabled) { background: #009991 !important; box-shadow: 0 6px 20px rgba(0,179,169,0.4) !important; }
      `}</style>

      <PublicNav />

      <div style={{ minHeight: "100vh", display: "flex", paddingTop: 68 }}>

        {/* ── Left teal panel ── */}
        <div style={{
          flex: "0 0 40%",
          background: "#00B3A9",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 52px",
          position: "sticky",
          top: 68,
          height: "calc(100vh - 68px)",
          overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: "rgba(255,255,255,0.07)", top: -210, left: -190, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "rgba(255,255,255,0.05)", bottom: -110, right: -80, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "white", letterSpacing: "-0.5px", marginBottom: 12, lineHeight: 1.25 }}>
              Trouvez les appels d'offres faits pour vous
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.8, marginBottom: 44 }}>
              Configurez votre profil une seule fois et recevez des opportunités parfaitement adaptées à votre entreprise.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                "Profil d'entreprise personnalisé",
                "2 000+ contrats actifs indexés",
                "17 régions du Québec couvertes",
                "Mise à jour quotidienne",
                "Compte gratuit, sans carte de crédit",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Step track */}
            <div style={{ marginTop: 56 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div key={i} style={{
                    height: 3, flex: 1, borderRadius: 2,
                    background: i <= step ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)",
                    transition: "background 0.35s",
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
                Étape {step + 1} sur {TOTAL_STEPS}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 68px)" }}>

          {/* Progress bar */}
          <div style={{ height: 3, background: "#edf3f3", flexShrink: 0 }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "#00B3A9",
              borderRadius: "0 2px 2px 0",
              transition: "width 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            }} />
          </div>

          {/* Centered form */}
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 64px",
          }}>
            <div style={{ width: "100%", maxWidth: 480 }}>

              {/* Back button */}
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "#8ba5a5",
                    fontSize: 13,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "0 0 22px",
                    fontWeight: 500,
                    transition: "color 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Retour
                </button>
              )}

              {/* Animated step content */}
              <div key={step} className={animClass}>
                <h1 style={{
                  fontSize: 25,
                  fontWeight: 800,
                  color: "#1b2a4a",
                  letterSpacing: "-0.5px",
                  marginBottom: 6,
                  lineHeight: 1.25,
                }}>
                  {STEP_TITLES[step]}
                </h1>
                <p style={{ fontSize: 14, color: "#4a6a6a", marginBottom: 26, lineHeight: 1.65 }}>
                  {STEP_SUBTITLES[step]}
                </p>

                {error && (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    padding: "11px 15px",
                    marginBottom: 18,
                    color: "#b91c1c",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                )}

                {renderStep()}

                <button
                  type="button"
                  className="next-btn"
                  onClick={goNext}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: 26,
                    padding: "14px 0",
                    background: loading ? "#8ba5a5" : "#00B3A9",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : "0 4px 16px rgba(0,179,169,0.3)",
                    transition: "background 0.15s, box-shadow 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {loading
                    ? "Création du compte…"
                    : step === TOTAL_STEPS - 1
                    ? "Créer mon compte"
                    : (
                      <>
                        Continuer
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5 2L10 7L5 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                </button>

                {step === 0 && (
                  <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#4a6a6a" }}>
                    Déjà un compte ?{" "}
                    <Link href="/login" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>
                      Se connecter
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
