"use client"
import { useState } from "react"
import Link from "next/link"
import type { Contract } from "@/api/contract"

export const MONTHS_FR = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"]

export function fmtDate(raw: string | null): string {
  if (!raw) return "—"
  const [y, m, d] = raw.split(" ")[0].split("-")
  return `${parseInt(d)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

export function daysLeft(raw: string | null): number | null {
  if (!raw) return null
  const closing = new Date(raw.split(" ")[0])
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((closing.getTime() - today.getTime()) / 86_400_000)
}

export function urgencyColor(days: number | null): string {
  if (days === null) return "#8ba5a5"
  if (days <= 3) return "#dc2626"
  if (days <= 7) return "#d97706"
  return "#16a34a"
}

export function statusBadgeStyle(statut: string): React.CSSProperties {
  const map: Record<string, { color: string; bg: string }> = {
    "Publié":         { color: "#15803d", bg: "#dcfce7" },
    "Annulé":         { color: "#dc2626", bg: "#fee2e2" },
    "Terminé":        { color: "#6b7280", bg: "#f3f4f6" },
    "Contrat conclu": { color: "#7c3aed", bg: "#ede9fe" },
    "Liste disponible": { color: "#0891b2", bg: "#e0f2fe" },
  }
  const s = map[statut] ?? { color: "#1d4ed8", bg: "#dbeafe" }
  return { color: s.color, background: s.bg }
}

function matchScoreStyle(score: number): { color: string; bg: string } {
  if (score >= 80) return { color: "#15803d", bg: "#dcfce7" }
  if (score >= 50) return { color: "#00786f", bg: "rgba(0,179,169,0.12)" }
  return { color: "#b45309", bg: "#fef3c7" }
}

export function ContractCard({ c, matchScore }: { c: Contract; matchScore?: number }) {
  const days = daysLeft(c.date_fermeture)
  const badge = statusBadgeStyle(c.statut)
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/explorer/${c.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "white",
          border: `1.5px solid ${hovered ? "#b3e6e3" : "#dce8e8"}`,
          borderRadius: 14,
          padding: "18px 22px",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: hovered ? "0 4px 16px rgba(0,179,169,0.08)" : "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                ...badge,
                fontSize: 11, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20,
                letterSpacing: 0.3, flexShrink: 0,
              }}>
                {c.statut}
              </span>
              {c.nature_contrat && (
                <span style={{ fontSize: 11, color: "#8ba5a5", fontWeight: 500 }}>
                  {c.nature_contrat}
                </span>
              )}
            </div>
            <p style={{
              fontWeight: 700, fontSize: 14, color: "#1b2a4a",
              marginBottom: 3, lineHeight: 1.4,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {c.titre}
            </p>
            <p style={{ fontSize: 13, color: "#4a6a6a", marginBottom: 0 }}>{c.organisation}</p>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {matchScore !== undefined && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 20, marginBottom: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                ...matchScoreStyle(matchScore),
              }}>
                {matchScore}% pertinent
              </div>
            )}
            {days !== null && (
              <div style={{ fontSize: 13, fontWeight: 700, color: urgencyColor(days), marginBottom: 2 }}>
                {days > 0 ? `${days}j` : days === 0 ? "Auj." : "Expiré"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#8ba5a5" }}>
              {c.date_fermeture ? fmtDate(c.date_fermeture) : "—"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, fontSize: 12, color: "#8ba5a5", flexWrap: "wrap", alignItems: "center" }}>
          {c.region && <span>{c.region}</span>}
          {c.region && c.categorie && <span style={{ color: "#dce8e8" }}>·</span>}
          {c.categorie && <span>{c.categorie.length > 40 ? c.categorie.slice(0, 40) + "…" : c.categorie}</span>}
          <span style={{ color: "#dce8e8" }}>·</span>
          <span>{fmtDate(c.date_publication)}</span>
        </div>
      </div>
    </Link>
  )
}
