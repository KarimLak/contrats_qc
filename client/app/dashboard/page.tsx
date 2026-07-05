"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { contractApi, type Contract } from "@/api/contract"
import AppLayout from "@/components/AppLayout"
import { DocumentIcon, CheckCircleIcon, PinIcon, TagIcon, SearchIcon, BellIcon, BarChartIcon, BookmarkIcon, ClockIcon } from "@/components/icons"

const MONTHS_FR = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"]

function fmtDate(raw: string | null): string {
  if (!raw) return "—"
  const [y, m, d] = raw.split(" ")[0].split("-")
  return `${parseInt(d)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

function daysLeft(raw: string | null): number | null {
  if (!raw) return null
  const closing = new Date(raw.split(" ")[0])
  const today   = new Date(); today.setHours(0,0,0,0)
  return Math.ceil((closing.getTime() - today.getTime()) / 86_400_000)
}

function urgencyColor(days: number | null): string {
  if (days === null) return "#8ba5a5"
  if (days <= 3)  return "#dc2626"
  if (days <= 7)  return "#d97706"
  return "#16a34a"
}

// ── Component ──────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user, subscription } = useAuth()

  const [stats, setStats]           = useState({ total: 0, active: 0, loading: true })
  const [recents, setRecents]       = useState<Contract[]>([])
  const [recentsLoading, setRL]     = useState(true)

  useEffect(() => {
    Promise.all([
      contractApi.get_contracts({}, 0, 1),
      contractApi.get_contracts({ statut: "Publié" }, 0, 1),
    ])
      .then(([all, active]) => setStats({ total: all.total, active: active.total, loading: false }))
      .catch(() => setStats(s => ({ ...s, loading: false })))
  }, [])

  useEffect(() => {
    contractApi.get_contracts({ statut: "Publié" }, 0, 5)
      .then(r => setRecents(r.contracts ?? []))
      .catch(() => {})
      .finally(() => setRL(false))
  }, [])

  const FEATURES = [
    {
      href: "/explorer", icon: SearchIcon, label: "Explorateur", locked: false,
      desc: "Parcourez les 2 000+ contrats actifs du SEAO avec des filtres avancés.",
      cta: "Ouvrir l'explorateur",
    },
    {
      href: "/alerts", icon: BellIcon, label: "Alertes", locked: subscription === "user",
      desc: "Recevez une notification instantanée dès qu'un contrat correspond à votre profil.",
      cta: subscription === "user" ? "Débloquer — Pro" : "Gérer mes alertes",
    },
    {
      href: "/analytics", icon: BarChartIcon, label: "Analytique", locked: subscription === "user",
      desc: "Tendances du marché, organisations actives, secteurs porteurs dans votre région.",
      cta: subscription === "user" ? "Débloquer — Pro" : "Voir l'analytique",
    },
    {
      href: "/saved", icon: BookmarkIcon, label: "Sauvegardés", locked: subscription === "user",
      desc: "Créez des listes de suivi et retrouvez instantanément les contrats qui vous intéressent.",
      cta: subscription === "user" ? "Débloquer — Pro" : "Mes sauvegardés",
    },
  ]

  return (
    <div style={{ padding: "32px 32px 64px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px", marginBottom: 4 }}>
          Bonjour, {user?.username} 
        </h1>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>Voici un aperçu de vos opportunités gouvernementales.</p>
      </div>

      {/* Upgrade banner (free only) */}
      {subscription === "user" && (
        <div style={{
          background: "linear-gradient(135deg, #1b2a4a 0%, #243a60 100%)",
          border: "1.5px solid rgba(0,179,169,0.25)", borderRadius: 16,
          padding: "20px 28px", marginBottom: 32,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "white", marginBottom: 4 }}>
              Passez à Pro et débloquez toutes les fonctionnalités
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              Alertes en temps réel, tableau analytique, sauvegarde et export — à partir de 29 $/mois.
            </p>
          </div>
          <Link href="/pricing" style={{
            padding: "10px 24px", background: "#00B3A9", color: "white", borderRadius: 10,
            fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,179,169,0.4)",
          }}>
            Voir les tarifs →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Contrats au total", value: stats.loading ? "…" : stats.total.toLocaleString("fr-CA"), icon: DocumentIcon, color: "#e6f7f6" },
          { label: "Contrats actifs",   value: stats.loading ? "…" : stats.active.toLocaleString("fr-CA"), icon: CheckCircleIcon, color: "#ecfdf5" },
          { label: "Régions couvertes", value: "17", icon: PinIcon, color: "#eff6ff" },
          { label: "Types d'avis",      value: "9",  icon: TagIcon, color: "#fdf4ff" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <s.icon size={19} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1px", lineHeight: 1, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#8ba5a5", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1b2a4a", marginBottom: 16, letterSpacing: "-0.2px" }}>
          Fonctionnalités
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {FEATURES.map(f => (
            <Link key={f.href} href={f.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white", border: "1.5px solid #dce8e8", borderRadius: 16,
                padding: "24px 26px", transition: "border-color 0.15s, box-shadow 0.15s",
                cursor: "pointer", height: "100%",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#00B3A9"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,179,169,0.08)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#dce8e8"; e.currentTarget.style.boxShadow = "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <f.icon size={20} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1b2a4a" }}>{f.label}</span>
                  {f.locked && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#e6f7f6", color: "#009991", letterSpacing: 0.5, marginLeft: "auto" }}>PRO</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.65, marginBottom: 16 }}>{f.desc}</p>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: f.locked ? "#00B3A9" : "#1b2a4a",
                }}>
                  {f.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent contracts */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1b2a4a", letterSpacing: "-0.2px" }}>
            Contrats publiés récemment
          </h2>
          <Link href="/explorer" style={{ fontSize: 13, color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>
            Voir tout →
          </Link>
        </div>

        {recentsLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8ba5a5", fontSize: 14 }}>Chargement…</div>
        ) : recents.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8ba5a5", fontSize: 14 }}>Aucun contrat récent.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recents.map(c => {
              const days = daysLeft(c.date_fermeture)
              return (
                <Link key={c.id} href="/explorer" style={{ textDecoration: "none" }}>
                  <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 12, padding: "14px 18px", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#b3e6e3")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#dce8e8")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: "#1b2a4a", marginBottom: 2, lineHeight: 1.35 }}>{c.titre}</p>
                        <p style={{ fontSize: 12, color: "#4a6a6a" }}>{c.organisation}</p>
                      </div>
                      {c.date_fermeture && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: urgencyColor(days), fontWeight: 600, flexShrink: 0 }}>
                          <ClockIcon size={13} />
                          {days !== null && days > 0 ? `${days}j` : days === 0 ? "Aujourd'hui" : "Expiré"}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: "#8ba5a5", alignItems: "center" }}>
                      {c.region && <span>{c.region}</span>}
                      {c.region && c.nature_contrat && <span style={{ color: "#dce8e8" }}>·</span>}
                      {c.nature_contrat && <span>{c.nature_contrat}</span>}
                      <span style={{ color: "#dce8e8" }}>·</span>
                      <span>{fmtDate(c.date_publication)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  )
}
