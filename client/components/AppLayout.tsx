"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useAuth, getAccessToken } from "@/context/AuthContext"
import { ToastProvider } from "@/components/Toast"
import { savedContractsApi } from "@/api/savedContracts"

const NAV: ({ href: string; label: string; pro: boolean } | { divider: true })[] = [
  { href: "/dashboard",   label: "Tableau de bord", pro: false },
  { href: "/explorer",    label: "Explorateur",     pro: false },
  { href: "/recommended", label: "Recommandés",     pro: false },
  { divider: true },
  { href: "/alerts",    label: "Alertes",          pro: true  },
  { href: "/analytics", label: "Analytique",       pro: true  },
  { href: "/saved",     label: "Sauvegardés",      pro: true  },
  { divider: true },
  { href: "/profile",   label: "Mon profil",       pro: false },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, subscription, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [savedClosingSoon, setSavedClosingSoon] = useState(0)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  // Sidebar badge: count of active-pipeline saved contracts closing within
  // 7 days — not the total saved count. Gated behind Pro/Enterprise: a free
  // user can't reach the Sauvegardés page (UpgradeGate), so the count would
  // be meaningless noise for them.
  useEffect(() => {
    if (!user || subscription === "user") { setSavedClosingSoon(0); return }
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    savedContractsApi.alertsCount(token)
      .then(res => { if (!cancelled) setSavedClosingSoon(res.count ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, subscription])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push("/login")
  }, [logout, router])

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7fafa", fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <div style={{ color: "#8ba5a5" }}>Chargement…</div>
      </div>
    )
  }

  const subLabel = subscription === "enterprise" ? "Enterprise" : subscription === "pro" ? "Pro" : "Gratuit"
  const subColor = subscription === "user" ? "rgba(255,255,255,0.12)" : "#00B3A9"
  const subText  = subscription === "user" ? "rgba(255,255,255,0.5)" : "white"

  return (
    <ToastProvider>
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#1b2a4a",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
        overflowY: "auto",
      }}>

        {/* Brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#00B3A9", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>C</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>contrats_qc</span>
          </Link>
        </div>

        {/* Subscription chip */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ padding: "3px 10px", borderRadius: 20, background: subColor, color: subText, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
              {subLabel}
            </span>
            {subscription === "user" && (
              <Link href="/pricing" style={{ fontSize: 11, color: "#00B3A9", textDecoration: "none", fontWeight: 600 }}>
                Upgrader →
              </Link>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "10px 0" }}>
          {NAV.map((item, i) => {
            if ("divider" in item) {
              return <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 20px" }} />
            }
            const active   = pathname === item.href || pathname.startsWith(item.href + "/")
            const locked   = item.pro && subscription === "user"
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 20px",
                textDecoration: "none", transition: "background 0.15s",
                background: active ? "rgba(0,179,169,0.14)" : "transparent",
                borderLeft: active ? "3px solid #00B3A9" : "3px solid transparent",
                color: active ? "#00B3A9" : locked ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.72)",
              }}>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1, lineHeight: 1.2 }}>{item.label}</span>
                {item.href === "/saved" && !locked && savedClosingSoon > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center",
                    padding: "2px 6px", borderRadius: 10, background: "#dc2626", color: "white",
                  }}>
                    {savedClosingSoon}
                  </span>
                )}
                {locked && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(0,179,169,0.18)", color: "#00B3A9", letterSpacing: 0.5 }}>PRO</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user info + logout */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 3, fontWeight: 600, letterSpacing: 0.3 }}>
            {user.username}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            style={{ width: "100%", padding: "8px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────── */}
      {/* minWidth: 0 overrides the flex item's default min-width: auto (which
          sizes to the widest descendant's min-content) — without it, a
          Recharts ResponsiveContainer inside this flex column measures its
          parent as width 0 on first layout pass and never recovers, then
          falls back to an oversized default that pushes the whole page into
          horizontal scroll. */}
      <main style={{ marginLeft: 240, flex: 1, minWidth: 0, minHeight: "100vh", background: "#f7fafa" }}>
        {children}
      </main>
    </div>
    </ToastProvider>
  )
}
