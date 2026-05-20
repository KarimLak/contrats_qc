"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../context/AuthContext"

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  const handleLogout = async (): Promise<void> => {
    await logout()
    router.push("/login")
  }

  if (loading || !user) return <p style={{ padding: 20 }}>Loading…</p>

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <h2>Dashboard</h2>
      <p style={{ marginTop: 8, color: "#666" }}>
        Logged in as <strong>{user.username}</strong>
      </p>

      <pre style={{ background: "#f4f4f4", padding: 16, borderRadius: 8, marginTop: 16, fontSize: 13 }}>
        {JSON.stringify(user, null, 2)}
      </pre>

      <button onClick={handleLogout} style={{ marginTop: 16 }}>
        Sign out
      </button>
    </div>
  )
}