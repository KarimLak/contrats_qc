"use client"
import Link from "next/link"
import { type ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"

interface Props {
  children:    ReactNode
  feature:     string
  description: string
  benefits:    string[]
  minHeight?:  number
}

export default function UpgradeGate({ children, feature, description, benefits, minHeight = 480 }: Props) {
  const { subscription } = useAuth()

  if (subscription !== "free") return <>{children}</>

  return (
    <div style={{ position: "relative", minHeight }}>
      {/* Blurred real content — creates FOMO */}
      <div style={{ filter: "blur(7px) brightness(0.88)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(247,250,250,0.82)", backdropFilter: "blur(3px)",
        padding: 24,
      }}>
        <div style={{
          background: "white", border: "1.5px solid #dce8e8", borderRadius: 20,
          padding: "40px 44px", maxWidth: 460, width: "100%", textAlign: "center",
          boxShadow: "0 24px 64px rgba(27,42,74,0.10), 0 4px 16px rgba(0,179,169,0.08)",
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#e6f7f6", border: "1.5px solid #b3e6e3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 18px" }}>
            🔒
          </div>

          <div style={{ display: "inline-block", padding: "4px 14px", background: "#00B3A9", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "white", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 14 }}>
            Fonctionnalité Pro
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#1b2a4a", marginBottom: 10, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
            {feature}
          </h3>
          <p style={{ fontSize: 14, color: "#4a6a6a", lineHeight: 1.75, marginBottom: 24 }}>
            {description}
          </p>

          <div style={{ textAlign: "left", marginBottom: 28 }}>
            {benefits.map(b => (
              <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: "#e6f7f6", border: "1px solid #b3e6e3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 11, color: "#009991", fontWeight: 800 }}>✓</div>
                <span style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.55 }}>{b}</span>
              </div>
            ))}
          </div>

          <Link href="/pricing" style={{
            display: "block", padding: "14px 0", background: "#00B3A9", color: "white",
            borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 4px 18px rgba(0,179,169,0.32)",
          }}>
            Passer à Pro →
          </Link>

          <p style={{ marginTop: 12, fontSize: 12, color: "#8ba5a5" }}>
            À partir de 29 $/mois · Sans engagement · Annulez à tout moment
          </p>
        </div>
      </div>
    </div>
  )
}
