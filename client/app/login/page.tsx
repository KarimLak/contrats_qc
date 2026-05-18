"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const { login } = useAuth()
  const router    = useRouter()
  const [form, setForm]       = useState({ username: "", password: "" })
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login(form.username, form.password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <h2>Sign in</h2>

      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <input
          placeholder="Username"
          value={form.username}
          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 12, fontSize: 14 }}>
        No account? <Link href="/register">Register</Link>
      </p>
    </div>
  )
}