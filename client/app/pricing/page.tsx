"use client"
import { useState } from "react"
import Link from "next/link"
import PublicNav from "@/components/PublicNav";

const PLANS = [
  {
    name: "Gratuit",
    price: "0",
    period: "pour toujours",
    desc: "Pour découvrir les appels d'offres publics sans engagement.",
    cta: "Commencer gratuitement",
    ctaHref: "/register",
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
    name: "Pro",
    price: "29",
    period: "par mois",
    desc: "Pour les équipes qui veulent ne manquer aucune opportunité.",
    cta: "Commencer avec Pro",
    ctaHref: "/contact",
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
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    desc: "Pour les organisations avec des besoins avancés et un volume élevé.",
    cta: "Parler à un expert",
    ctaHref: "/contact",
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

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', system-ui, sans-serif; background: #f7fafa; color: #1b2a4a; -webkit-font-smoothing: antialiased; }
      `}</style>

      {/* Nav */}
      <PublicNav />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 96px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>Tarification</span>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
            Simple et transparent
          </h1>
          <p style={{ fontSize: 18, color: "#4a6a6a", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Commencez gratuitement. Passez à Pro quand vous êtes prêt à ne plus manquer aucune opportunité.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 72 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: "white",
              border: plan.highlight ? "2px solid #00B3A9" : "1.5px solid #dce8e8",
              borderRadius: 20, overflow: "hidden",
              boxShadow: plan.highlight ? "0 8px 40px rgba(0,179,169,0.15)" : "none",
              position: "relative",
            }}>
              {plan.highlight && (
                <div style={{ background: "#00B3A9", textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "white", letterSpacing: 0.7 }}>
                  ⭐ LE PLUS POPULAIRE
                </div>
              )}
              <div style={{ padding: "32px 32px 28px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#00B3A9", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
                  {plan.price === "Sur mesure" ? (
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1px" }}>Sur mesure</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 42, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1.5px", lineHeight: 1 }}>{plan.price} $</span>
                      {plan.period && <span style={{ fontSize: 13, color: "#8ba5a5", marginBottom: 6 }}>/{plan.period}</span>}
                    </>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.6, marginBottom: 24 }}>{plan.desc}</p>

                <Link href={plan.ctaHref} style={{
                  display: "block", padding: "13px 0", textAlign: "center", borderRadius: 12,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                  background: plan.highlight ? "#00B3A9" : "transparent",
                  color: plan.highlight ? "white" : "#1b2a4a",
                  border: plan.highlight ? "none" : "1.5px solid #dce8e8",
                  boxShadow: plan.highlight ? "0 4px 16px rgba(0,179,169,0.3)" : "none",
                }}>
                  {plan.cta}
                </Link>
              </div>

              <div style={{ padding: "0 32px 32px" }}>
                <div style={{ height: 1, background: "#f0f4f4", marginBottom: 20 }} />
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: "#e6f7f6", border: "1px solid #b3e6e3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 10, color: "#009991", fontWeight: 800 }}>✓</div>
                    <span style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 10, color: "#ccc", fontWeight: 800 }}>✕</div>
                    <span style={{ fontSize: 13, color: "#b3c8c8", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee strip */}
        <div style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 16, padding: "28px 40px", marginBottom: 72, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24, textAlign: "center" }}>
          {[
            { icon: "🔒", label: "Paiement sécurisé", sub: "Cryptage SSL 256-bit" },
            { icon: "🔄", label: "Annulation libre", sub: "Sans engagement ni frais" },
            { icon: "🇨🇦", label: "Données québécoises", sub: "Sources officielles SEAO" },
            { icon: "💬", label: "Support humain", sub: "Réponse en < 24h" },
          ].map(g => (
            <div key={g.label}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1b2a4a", marginBottom: 2 }}>{g.label}</p>
              <p style={{ fontSize: 12, color: "#8ba5a5" }}>{g.sub}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1b2a4a", textAlign: "center", marginBottom: 36, letterSpacing: "-0.5px" }}>
            Questions fréquentes
          </h2>
          {FAQ.map((item, i) => (
            <div key={i} style={{ borderBottom: "1px solid #dce8e8" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: "100%", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1b2a4a" }}>{item.q}</span>
                <span style={{ fontSize: 18, color: "#8ba5a5", transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 16 }}>+</span>
              </button>
              {openFaq === i && (
                <p style={{ fontSize: 14, color: "#4a6a6a", lineHeight: 1.75, paddingBottom: 20 }}>{item.a}</p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: 72, padding: "56px 40px", background: "#1b2a4a", borderRadius: 24 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.5px", marginBottom: 12 }}>
            Prêt à commencer ?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
            Créez votre compte gratuitement en moins d'une minute.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ padding: "14px 32px", background: "#00B3A9", color: "white", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,179,169,0.4)" }}>
              Créer un compte gratuit
            </Link>
            <Link href="/contact" style={{ padding: "14px 32px", background: "transparent", color: "white", borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.25)" }}>
              Contacter l'équipe
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#1b2a4a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#00B3A9", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800 }}>C</div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>contrats_qc</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© 2026 — Données SEAO du Québec</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["À propos", "/about"], ["Tarifs", "/pricing"], ["Connexion", "/login"], ["Inscription", "/register"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </>
  )
}
