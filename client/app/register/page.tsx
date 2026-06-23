"use client"
import { useState, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import PublicNav from "@/components/PublicNav"

const SECTOR_OPTIONS = [
  "Approvisionnement (biens)",
  "Autres",
  "Concession",
  "Services",
  "Partenariat",
  "Travaux de construction",
  "Ventes de biens immeubles",
  "Ventes de biens meubles",
]

const CONTRACT_TYPE_OPTIONS = [
  "Avis d'appel d'intérêt",
  "Avis d'appel d'offres",
  "Avis d'appel d'offres régionalisé",
  "Avis d'appel d'offres réservé aux petites entreprises du Québec et à celles d'ailleurs au Canada",
  "Avis d'appel d'offres sur invitation",
  "Avis d'homologation de produits (Approvisionnements)",
  "Avis d'intention",
  "Avis de demande de prix auprès des entreprises qualifiées",
  "Avis de qualification",
  "Avis de qualification d'entrepreneurs (infrastructures de transport)",
  "Contrat à la suite d'un achat mandaté ou d'un regroupement d'organismes",
  "Contrat à la suite d'un appel d'offres sur invitation",
  "Contrat conclu - Appel d'offres public non publié au SEAO",
  "Contrat de gré à gré",
  "Contrat relatif aux infrastructures de transport",
  "Documents normatifs",
]

const REGION_OPTIONS = [
  "Abitibi-Témiscamingue",
  "Bas-Saint-Laurent",
  "Capitale-Nationale",
  "Centre-du-Québec",
  "Chaudière-Appalaches",
  "Côte-Nord",
  "Estrie",
  "Gaspésie–Îles-de-la-Madeleine",
  "Lanaudière",
  "Laurentides",
  "Laval",
  "Mauricie",
  "Montréal",
  "Montérégie",
  "Nord-du-Québec",
  "Outaouais",
  "Saguenay–Lac-Saint-Jean",
]

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
  "Ajoutez les expertises clés de votre entreprise (ex. : génie civil, TI…).",
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
  const [expertiseInput, setExpertiseInput] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100)

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
        router.push("/dashboard")
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

  const toggleMulti = (field: "sector" | "contract_type" | "region", value: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  const addExpertise = () => {
    const val = expertiseInput.trim()
    if (val && !form.expertise.includes(val)) {
      setForm(f => ({ ...f, expertise: [...f.expertise, val] }))
    }
    setExpertiseInput("")
  }

  const removeExpertise = (val: string) =>
    setForm(f => ({ ...f, expertise: f.expertise.filter(e => e !== val) }))

  const handleExpertiseKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addExpertise()
    }
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
            {SECTOR_OPTIONS.map(opt => {
              const active = form.sector.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  className="chip-btn"
                  onClick={() => toggleMulti("sector", opt)}
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
                  {opt}
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
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={expertiseInput}
                onChange={e => setExpertiseInput(e.target.value)}
                onKeyDown={handleExpertiseKey}
                placeholder="Ex. : Génie civil, TI, Construction…"
                style={{ ...INPUT, flex: 1 }}
              />
              <button
                type="button"
                onClick={addExpertise}
                style={{
                  padding: "0 20px",
                  background: "#00B3A9",
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 22,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                +
              </button>
            </div>
            {form.expertise.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {form.expertise.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      background: "rgba(0,179,169,0.1)",
                      border: "1.5px solid #00B3A9",
                      borderRadius: 50,
                      fontSize: 13,
                      color: "#00B3A9",
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeExpertise(tag)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#00B3A9",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 0,
                        lineHeight: 1,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: "#8ba5a5", marginTop: 2 }}>
              Appuyez sur Entrée ou virgule pour ajouter.
            </p>
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
