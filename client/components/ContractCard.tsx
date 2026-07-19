"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { ScoreBreakdown } from "@/api/contract"
import { BookmarkIcon, EyeOffIcon } from "@/components/icons"

// The card only ever reads this subset — satisfied by both the full Contract
// (explorer, saved) and the slimmer RecommendedContract (recommended listing,
// which deliberately doesn't carry the rest of Contract's ~30 fields).
export interface CardContract {
  id:               number
  titre:            string
  organisation:     string
  statut:           string
  nature_contrat:   string
  categorie:        string
  region:           string
  type_avis:        string
  date_publication: string
  date_fermeture:   string | null
}

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
  if (days < 7) return "#dc2626"
  if (days < 14) return "#d97706"
  return "#4a6a6a"
}

export function isClosingSoon(days: number | null): boolean {
  return days !== null && days >= 0 && days < 7
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

interface Criterion {
  label:   string
  points:  number
  matched: boolean
  detail:  string | null
}

function scoreCriteria(c: CardContract, b: ScoreBreakdown): Criterion[] {
  return [
    { label: "Expertise",         points: 35, matched: b.expertise,     detail: c.categorie || null },
    { label: "Secteur",           points: 25, matched: b.sector,        detail: c.nature_contrat || null },
    { label: "Région",            points: 20, matched: b.region,        detail: c.region || null },
    { label: "Nature du contrat", points: 15, matched: b.contract_type, detail: c.type_avis || null },
    { label: "Réservé PME",       points: 5,  matched: b.sme_reserved,  detail: null },
  ]
}

interface ContractCardProps {
  c: CardContract
  matchScore?: number
  scoreBreakdown?: ScoreBreakdown
  saved?: boolean
  onToggleSave?: () => void
  onNotRelevant?: () => void
}

export function ContractCard({ c, matchScore, scoreBreakdown, saved, onToggleSave, onNotRelevant }: ContractCardProps) {
  const days = daysLeft(c.date_fermeture)
  const badge = statusBadgeStyle(c.statut)
  const [hovered, setHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const showActions = onToggleSave !== undefined || onNotRelevant !== undefined

  useEffect(() => {
    if (!popoverOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [popoverOpen])

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

          <div style={{ textAlign: "right", flexShrink: 0, position: "relative" }}>
            {matchScore !== undefined && (
              <div
                ref={popoverRef}
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  type="button"
                  onClick={e => {
                    if (!scoreBreakdown) return
                    e.preventDefault(); e.stopPropagation()
                    setPopoverOpen(o => !o)
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 20, marginBottom: 6,
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                    border: "none", fontFamily: "inherit",
                    cursor: scoreBreakdown ? "pointer" : "default",
                    ...matchScoreStyle(matchScore),
                  }}
                >
                  {matchScore}% pertinent
                </button>

                {popoverOpen && scoreBreakdown && (
                  <div
                    onClick={e => { e.preventDefault(); e.stopPropagation() }}
                    style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 6,
                      background: "white", border: "1.5px solid #dce8e8", borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(27,42,74,0.14)", padding: "12px 14px",
                      width: 260, zIndex: 20, textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#8ba5a5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                      Détail du score
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {scoreCriteria(c, scoreBreakdown).map(crit => (
                        <div key={crit.label} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5 }}>
                          <span style={{
                            flexShrink: 0, fontWeight: 700,
                            color: crit.matched ? "#16a34a" : "#c0d4d4",
                          }}>
                            {crit.matched ? "✓" : "✗"}
                          </span>
                          <span style={{ color: crit.matched ? "#1b2a4a" : "#8ba5a5", lineHeight: 1.4 }}>
                            <b>{crit.label}</b>
                            {crit.matched && <span style={{ color: "#00786f", fontWeight: 600 }}> +{crit.points}</span>}
                            {crit.detail && <> : {crit.detail}</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {isClosingSoon(days) && (
              <div style={{
                display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 20,
                marginBottom: 4,
              }}>
                Ferme bientôt
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

        {showActions && (
          <div style={{
            display: "flex", gap: 8, marginTop: 12, paddingTop: 12,
            borderTop: "1px solid #eef4f4",
          }}>
            {onToggleSave && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSave() }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer",
                  border: saved ? "1.5px solid #00B3A9" : "1.5px solid #dce8e8",
                  background: saved ? "rgba(0,179,169,0.08)" : "white",
                  color: saved ? "#00786f" : "#4a6a6a",
                }}
              >
                <BookmarkIcon size={14} color={saved ? "#00786f" : "#8ba5a5"} />
                {saved ? "Sauvegardé" : "Sauvegarder"}
              </button>
            )}
            {onNotRelevant && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onNotRelevant() }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer",
                  border: "1.5px solid #dce8e8", background: "white", color: "#4a6a6a",
                }}
              >
                <EyeOffIcon size={14} color="#8ba5a5" />
                Pas pertinent
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
