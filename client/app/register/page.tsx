"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import PublicNav from "@/components/PublicNav";

export default function RegisterPage() {
  const { register } = useAuth()
  const router       = useRouter()
  const [form, setForm]     = useState({ username: "", email: "", password: "" })
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      await register(form.username, form.email, form.password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du compte")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', system-ui, sans-serif; background: #f7fafa; color: #1b2a4a; -webkit-font-smoothing: antialiased; }
        input:focus { border-color: #00B3A9 !important; outline: none; box-shadow: 0 0 0 3px rgba(0,179,169,0.1); }
      `}</style>

      <PublicNav />

      <div style={{ minHeight: "100vh", display: "flex" }}>
        {/* Right panel first on register to vary the layout */}
        <div style={{
          flex: 1, background: "#00B3A9", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "64px 72px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "rgba(255,255,255,0.1)", top: -250, left: -200, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -150, right: -100, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 48 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 800 }}>C</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>contrats_qc</span>
            </Link>

            <h2 style={{ fontSize: 30, fontWeight: 800, color: "white", letterSpacing: "-0.5px", marginBottom: 16, lineHeight: 1.2 }}>
              Rejoignez des dizaines d'entreprises québécoises
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.8, marginBottom: 36 }}>
              Créez votre compte gratuit et commencez à explorer les appels d'offres gouvernementaux en moins d'une minute.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "2 000+ contrats actifs indexés" },
                { label: "17 régions du Québec couvertes" },
                { label: "Mise à jour quotidienne" },
                { label: "Compte gratuit, sans carte de crédit" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 64px", maxWidth: 520 }}>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.7px", marginBottom: 8, lineHeight: 1.15 }}>
            Créer un compte gratuit
          </h1>
          <p style={{ fontSize: 14, color: "#4a6a6a", marginBottom: 32, lineHeight: 1.6 }}>
            Aucune carte de crédit requise. Accès instantané.
          </p>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#b91c1c", fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1b2a4a", marginBottom: 7 }}>
                Adresse courriel
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="vous@entreprise.ca"
                required
                style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1b2a4a", background: "white", transition: "border-color 0.15s" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1b2a4a", marginBottom: 7 }}>
                Nom d'utilisateur
              </label>
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="votre_nom"
                required
                style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1b2a4a", background: "white", transition: "border-color 0.15s" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1b2a4a", marginBottom: 7 }}>
                Mot de passe
                <span style={{ fontSize: 11, color: "#8ba5a5", fontWeight: 400, marginLeft: 6 }}>— 8 caractères minimum</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                minLength={8}
                required
                style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #dce8e8", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#1b2a4a", background: "white", transition: "border-color 0.15s" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px 0", background: loading ? "#8ba5a5" : "#00B3A9", border: "none",
                borderRadius: 12, color: "white", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 4px 16px rgba(0,179,169,0.3)",
                marginTop: 4,
              }}
            >
              {loading ? "Création du compte…" : "Créer mon compte gratuit"}
            </button>

            <p style={{ fontSize: 12, color: "#8ba5a5", textAlign: "center", lineHeight: 1.6 }}>
              En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </p>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#4a6a6a" }}>
            Déjà un compte ?{" "}
            <Link href="/login" style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
