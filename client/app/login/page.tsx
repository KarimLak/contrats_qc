"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../context/AuthContext"
import PublicNav from "@/components/PublicNav"


export default function Login() {
  const { login } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ username: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading} = useAuth()


  useEffect(() => {
  if (!authLoading && user) {
    router.push("/explorer")  // already logged in → skip login page
  }
}, [user, authLoading, router])

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login(form.username, form.password)
      router.push("/explorer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --teal: #00B3A9; --teal-d: #009991; --teal-l: #E6F7F6; --teal-mid: #B3E6E3;
          --navy: #1B2A4A; --white: #FFFFFF; --cream: #F7FAFA;
          --border: #DCE8E8; --text: #1B2A4A; --text2: #4A6A6A; --text3: #8BA5A5;
          --sans: 'Outfit', system-ui, sans-serif; --r: 12px;
        }
        body { font-family: var(--sans); background: var(--cream); color: var(--text); -webkit-font-smoothing: antialiased; }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
          position: relative;
          overflow: hidden;
        }
        .login-blob1 {
          position: absolute; border-radius: 50%; pointer-events: none;
          width: 600px; height: 600px; top: -200px; right: -150px;
          background: radial-gradient(circle, rgba(0,179,169,0.1) 0%, transparent 65%);
        }
        .login-blob2 {
          position: absolute; border-radius: 50%; pointer-events: none;
          width: 400px; height: 400px; bottom: -100px; left: -100px;
          background: radial-gradient(circle, rgba(0,179,169,0.07) 0%, transparent 65%);
        }
        .login-card {
          position: relative; z-index: 1;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 48px 44px;
          width: 100%; max-width: 420px;
          box-shadow: 0 4px 32px rgba(27,42,74,0.07);
        }
        .login-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; margin-bottom: 32px;
        }
        .login-logo-mark {
          width: 32px; height: 32px; border-radius: 9px;
          background: var(--teal); display: flex; align-items: center;
          justify-content: center; color: white; font-size: 15px; font-weight: 800;
        }
        .login-logo-name {
          font-size: 18px; font-weight: 800; color: var(--navy); letter-spacing: -0.3px;
        }
        .login-title {
          font-size: 26px; font-weight: 800; color: var(--navy);
          letter-spacing: -0.5px; margin-bottom: 6px;
        }
        .login-sub {
          font-size: 14px; color: var(--text2); margin-bottom: 32px; line-height: 1.5;
        }
        .login-label {
          display: block; font-size: 13px; font-weight: 600;
          color: var(--navy); margin-bottom: 6px;
        }
        .login-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid var(--border); border-radius: var(--r);
          font-size: 14px; font-family: var(--sans); color: var(--text);
          background: var(--white); outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          margin-bottom: 16px;
        }
        .login-input:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(0,179,169,0.1);
        }
        .login-input::placeholder { color: var(--text3); }
        .login-error {
          background: #fff5f5; border: 1.5px solid #fecaca;
          border-radius: var(--r); padding: 10px 14px;
          font-size: 13px; color: #dc2626; margin-bottom: 16px;
        }
        .login-btn {
          width: 100%; padding: 13px;
          background: var(--teal); border: none; border-radius: var(--r);
          color: white; font-size: 15px; font-weight: 700;
          font-family: var(--sans); cursor: pointer;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 14px rgba(0,179,169,0.3);
          margin-top: 4px;
        }
        .login-btn:hover:not(:disabled) {
          background: var(--teal-d);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,179,169,0.35);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-footer {
          margin-top: 24px; text-align: center;
          font-size: 13px; color: var(--text2);
        }
        .login-footer a {
          color: var(--teal); font-weight: 600; text-decoration: none;
        }
        .login-footer a:hover { color: var(--teal-d); }
        .login-divider {
          border: none; border-top: 1.5px solid var(--border); margin: 24px 0;
        }
      `}</style>

      <PublicNav />

      <div className="login-page">
        <div className="login-blob1" />
        <div className="login-blob2" />

        <div className="login-card">
          <Link href="/" className="login-logo">
            <div className="login-logo-mark">C</div>
            <span className="login-logo-name">contrats_qc</span>
          </Link>

          <h1 className="login-title">Bon retour </h1>
          <p className="login-sub">Connectez-vous pour accéder à votre tableau de bord.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={submit}>
            <label className="login-label" htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              className="login-input"
              placeholder="votre_nom"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
            />

            <label className="login-label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter →"}
            </button>
          </form>

          <hr className="login-divider" />

          <p className="login-footer">
            Pas encore de compte ?{" "}
            <Link href="/register">S'inscrire gratuitement</Link>
          </p>
        </div>
      </div>
    </>
  )
}