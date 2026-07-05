"use client"
import { useState, type ReactNode } from "react"
import Link from "next/link"
import PublicNav from "@/components/PublicNav"
import AppLayout from "@/components/AppLayout"
import { useAuth } from "@/context/AuthContext"
import { LockIcon, RefreshIcon, FlagIcon, ChatIcon } from "@/components/icons"

const PLANS = [
  {
    key: "user",
    name: "Gratuit",
    price: "0",
    period: "pour toujours",
    desc: "Pour découvrir les appels d'offres publics sans engagement.",
    ctaPublic: { label: "Commencer gratuitement", href: "/register" },
    ctaApp:    { label: "Votre plan actuel", href: null },
    highlight: false,
    features: [
      "Accès à l'explorateur de contrats",
      "2 000+ contrats indexés",
      "Filtres par région, catégorie, type",
      "Fiche complète de chaque avis",
      "Lien direct vers le SEAO",
      "20 résultats par page",
    ],
    missing: [
      "Alertes en temps réel",
      "Tableau analytique",
      "Sauvegarde de contrats",
      "Export CSV / JSON",
      "Support prioritaire",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "29",
    period: "par mois",
    desc: "Pour les équipes qui veulent ne manquer aucune opportunité.",
    ctaPublic: { label: "Commencer avec Pro", href: "/contact" },
    ctaApp:    { label: "Passer à Pro →", href: "/contact" },
    highlight: true,
    features: [
      "Tout ce qui est inclus dans Gratuit",
      "Alertes en temps réel par email",
      "Tableau analytique complet",
      "Tendances et organisations actives",
      "Sauvegarde de contrats",
      "Création de listes de suivi",
      "Export CSV / JSON",
      "Résultats illimités",
      "Support prioritaire < 24h",
    ],
    missing: [],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    desc: "Pour les organisations avec des besoins avancés et un volume élevé.",
    ctaPublic: { label: "Parler à un expert", href: "/contact" },
    ctaApp:    { label: "Contacter l'équipe →", href: "/contact" },
    highlight: false,
    features: [
      "Tout ce qui est inclus dans Pro",
      "Conseiller dédié à votre compte",
      "Accompagnement à la soumission",
      "Revue mensuelle de portefeuille",
      "Formation aux marchés publics",
      "Alertes premium pré-publication",
      "Intégration API personnalisée",
      "Accès multi-utilisateurs",
      "Contrat annuel avec remise",
    ],
    missing: [],
  },
]

const FAQ = [
  { q: "Puis-je annuler à tout moment ?", a: "Oui. Il n'y a aucun engagement. Vous pouvez annuler votre abonnement Pro à tout moment et conserver l'accès jusqu'à la fin de la période payée." },
  { q: "Les données sont-elles mises à jour en temps réel ?", a: "Les contrats sont indexés quotidiennement depuis les données ouvertes du SEAO. Les alertes Pro sont envoyées dès la détection d'un nouveau contrat correspondant à votre profil." },
  { q: "Est-ce que la facturation est mensuelle ou annuelle ?", a: "La facturation est mensuelle par défaut. Contactez-nous pour une offre annuelle avec 2 mois offerts." },
  { q: "Puis-je essayer Pro avant de payer ?", a: "Contactez-nous pour une démonstration complète ou un accès d'essai de 14 jours." },
  { q: "Les données proviennent-elles uniquement du Québec ?", a: "Oui. La plateforme agrège exclusivement les données du SEAO (Service électronique d'appels d'offres du Québec), couvrant toutes les régions de la province." },
]

function PricingContent({ isApp, subscription }: { isApp: boolean; subscription: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: isApp ? "32px 32px 80px" : "64px 24px 96px",
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>
          Tarification
        </span>
        <h1 style={{ fontSize: isApp ? 36 : 46, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 14 }}>
          Simple et transparent
        </h1>
        <p style={{ fontSize: 17, color: "#4a6a6a", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
          Commencez gratuitement. Passez à Pro quand vous êtes prêt à ne plus manquer aucune opportunité.
        </p>
      </div>

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, marginBottom: 64 }}>
        {PLANS.map(plan => {
          const isCurrent = isApp && plan.key === subscription
          const cta = isApp ? plan.ctaApp : plan.ctaPublic

          return (
            <div key={plan.name} style={{
              background: "white",
              border: plan.highlight ? "2px solid #00B3A9" : isCurrent ? "2px solid #1b2a4a" : "1.5px solid #dce8e8",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: plan.highlight ? "0 8px 40px rgba(0,179,169,0.15)" : "none",
              position: "relative",
            }}>
              {plan.highlight && (
                <div style={{ background: "#00B3A9", textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "white", letterSpacing: 0.7 }}>
                  LE PLUS POPULAIRE
                </div>
              )}
              {isCurrent && !plan.highlight && (
                <div style={{ background: "#1b2a4a", textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "white", letterSpacing: 0.7 }}>
                  VOTRE PLAN ACTUEL
                </div>
              )}

              <div style={{ padding: "28px 28px 20px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#00B3A9", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
                  {plan.price === "Sur mesure" ? (
                    <span style={{ fontSize: 30, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1px" }}>Sur mesure</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 40, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1.5px", lineHeight: 1 }}>{plan.price} $</span>
                      {plan.period && <span style={{ fontSize: 13, color: "#8ba5a5", marginBottom: 6 }}>/{plan.period}</span>}
                    </>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.6, marginBottom: 22 }}>{plan.desc}</p>

                {cta.href ? (
                  <Link href={cta.href} style={{
                    display: "block", padding: "12px 0", textAlign: "center", borderRadius: 12,
                    fontSize: 14, fontWeight: 700, textDecoration: "none",
                    background: plan.highlight ? "#00B3A9" : "transparent",
                    color: plan.highlight ? "white" : "#1b2a4a",
                    border: plan.highlight ? "none" : "1.5px solid #dce8e8",
                    boxShadow: plan.highlight ? "0 4px 16px rgba(0,179,169,0.3)" : "none",
                  }}>
                    {cta.label}
                  </Link>
                ) : (
                  <div style={{
                    display: "block", padding: "12px 0", textAlign: "center", borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    color: "#8ba5a5",
                    background: "#f7fafa",
                    border: "1.5px solid #dce8e8",
                  }}>
                    {cta.label}
                  </div>
                )}
              </div>

              <div style={{ padding: "0 28px 28px" }}>
                <div style={{ height: 1, background: "#f0f4f4", marginBottom: 18 }} />
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
                    <div style={{ width: 17, height: 17, borderRadius: 5, background: "#e6f7f6", border: "1px solid #b3e6e3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 9, color: "#009991", fontWeight: 800 }}>✓</div>
                    <span style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
                    <div style={{ width: 17, height: 17, borderRadius: 5, background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 9, color: "#ccc", fontWeight: 800 }}>✕</div>
                    <span style={{ fontSize: 13, color: "#b3c8c8", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Guarantee strip */}
      <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 16, padding: "24px 36px", marginBottom: 64, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20, textAlign: "center" }}>
        {[
          { icon: LockIcon, label: "Paiement sécurisé",    sub: "Cryptage SSL 256-bit" },
          { icon: RefreshIcon, label: "Annulation libre",      sub: "Sans engagement ni frais" },
          { icon: FlagIcon, label: "Données québécoises", sub: "Sources officielles SEAO" },
          { icon: ChatIcon, label: "Support humain",        sub: "Réponse en < 24h" },
        ].map(g => (
          <div key={g.label}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><g.icon size={24} /></div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1b2a4a", marginBottom: 2 }}>{g.label}</p>
            <p style={{ fontSize: 12, color: "#8ba5a5" }}>{g.sub}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", textAlign: "center", marginBottom: 32, letterSpacing: "-0.5px" }}>
          Questions fréquentes
        </h2>
        {FAQ.map((item, i) => (
          <div key={i} style={{ borderBottom: "1px solid #dce8e8" }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1b2a4a" }}>{item.q}</span>
              <span style={{ fontSize: 18, color: "#8ba5a5", transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 16 }}>+</span>
            </button>
            {openFaq === i && (
              <p style={{ fontSize: 14, color: "#4a6a6a", lineHeight: 1.75, paddingBottom: 18 }}>{item.a}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA — only for public visitors */}
      {!isApp && (
        <div style={{ textAlign: "center", marginTop: 64, padding: "48px 40px", background: "#1b2a4a", borderRadius: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.5px", marginBottom: 10 }}>
            Prêt à commencer ?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 28 }}>
            Créez votre compte gratuitement en moins d'une minute.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ padding: "13px 28px", background: "#00B3A9", color: "white", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,179,169,0.4)" }}>
              Créer un compte gratuit
            </Link>
            <Link href="/contact" style={{ padding: "13px 28px", background: "transparent", color: "white", borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.25)" }}>
              Contacter l'équipe
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  const { user, loading, subscription } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7fafa", fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <div style={{ color: "#8ba5a5" }}>Chargement…</div>
      </div>
    )
  }

  if (user) {
    return (
      <AppLayout>
        <PricingContent isApp subscription={subscription} />
      </AppLayout>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', system-ui, sans-serif; background: #f7fafa; color: #1b2a4a; -webkit-font-smoothing: antialiased; }
      `}</style>
      <PublicNav />
      <PricingContent isApp={false} subscription="" />
      <footer style={{ background: "#1b2a4a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#00B3A9", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800 }}>C</div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>contrats_qc</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© 2026 — Données SEAO du Québec</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Tarifs", "/pricing"], ["Connexion", "/login"], ["Inscription", "/register"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </>
  )
}
