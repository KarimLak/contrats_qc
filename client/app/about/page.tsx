"use client"
import PublicNav from "@/components/PublicNav";
import Link from "next/link"

const VALUES = [
  { title: "100 % québécois", desc: "Nos données proviennent exclusivement du SEAO, le portail officiel des appels d'offres publics du Québec. Aucune donnée étrangère, aucun agrément hors province." },
  { title: "Accès ouvert", desc: "Nous croyons que les données gouvernementales appartiennent aux citoyens. C'est pourquoi l'explorateur de base est et restera gratuit." },
  { title: "Simple d'abord", desc: "La complexité de la soumission publique est déjà suffisante. Notre interface se veut claire, rapide et accessible même pour les néophytes." },
  { title: "PME en priorité", desc: "Les grandes entreprises ont déjà leurs équipes dédiées. Nous construisons contrats_qc pour les PME québécoises qui méritent les mêmes outils." },
]

const STATS = [
  { n: "2 000+", l: "Contrats indexés" },
  { n: "17",     l: "Régions couvertes" },
  { n: "24h",    l: "Délai de mise à jour" },
  { n: "2026",   l: "Lancé au Québec" },
]

export default function AboutPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', system-ui, sans-serif; background: #fff; color: #1b2a4a; -webkit-font-smoothing: antialiased; }
      `}</style>

      {/* Nav */}
      <PublicNav />

      {/* Hero */}
      <section style={{ padding: "80px 56px 64px", background: "#f7fafa", borderBottom: "1px solid #dce8e8" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>À propos</span>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 20 }}>
            Rendre les marchés publics accessibles à toutes les entreprises québécoises
          </h1>
          <p style={{ fontSize: 17, color: "#4a6a6a", lineHeight: 1.8 }}>
            contrats_qc est né d'un constat simple : trop d'entreprises québécoises ignorent ou renoncent aux appels d'offres publics faute d'outils adaptés. Nous sommes ici pour changer ça.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "#1b2a4a", padding: "40px 56px", display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
        {STATS.map(s => (
          <div key={s.l} style={{ textAlign: "center", padding: "12px 56px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: "-1px", marginBottom: 4 }}>{s.n}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{s.l}</div>
          </div>
        ))}
      </section>

      {/* Mission */}
      <section style={{ padding: "80px 56px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>Notre mission</span>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.7px", lineHeight: 1.2, marginBottom: 20 }}>
              Moins de 1 % des PME québécoises soumissionnent sur des contrats gouvernementaux.
            </h2>
            <p style={{ fontSize: 15, color: "#4a6a6a", lineHeight: 1.8, marginBottom: 16 }}>
              Ce chiffre illustre un écart énorme entre la disponibilité des contrats gouvernementaux et la capacité des entreprises à y accéder efficacement. Le SEAO publie des dizaines d'appels d'offres chaque semaine — mais les trouver, les comprendre et y répondre reste un défi pour la plupart.
            </p>
            <p style={{ fontSize: 15, color: "#4a6a6a", lineHeight: 1.8 }}>
              contrats_qc centralise, simplifie et met en forme ces données pour que chaque entreprise québécoise — grande ou petite — puisse identifier et saisir les opportunités qui lui correspondent.
            </p>
          </div>
          <div style={{ background: "#f7fafa", border: "1.5px solid #dce8e8", borderRadius: 20, padding: "40px 36px" }}>
            <p style={{ fontSize: 38, fontWeight: 800, color: "#00B3A9", letterSpacing: "-1px", marginBottom: 12 }}>1 %</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1b2a4a", marginBottom: 10 }}>
              des PME québécoises soumissionnent sur des contrats gouvernementaux
            </p>
            <p style={{ fontSize: 13, color: "#8ba5a5", lineHeight: 1.6 }}>
              Source : Innovation, Sciences et Développement économique Canada, 2024.
            </p>
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#e6f7f6", borderRadius: 12, border: "1px solid #b3e6e3" }}>
              <p style={{ fontSize: 14, color: "#009991", fontWeight: 600, lineHeight: 1.5 }}>
                Plus de 2 000 contrats actifs attendent des soumissionnaires qualifiés en ce moment même.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: "#f7fafa", padding: "80px 56px", borderTop: "1px solid #dce8e8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>Nos valeurs</span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px", marginBottom: 48 }}>Ce en quoi nous croyons</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            {VALUES.map(v => (
              <div key={v.title} style={{ background: "white", border: "1.5px solid #dce8e8", borderRadius: 16, padding: "32px 28px" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1b2a4a", marginBottom: 10 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: "#4a6a6a", lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data source */}
      <section style={{ padding: "64px 56px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#00B3A9", display: "block", marginBottom: 12 }}>Sources de données</span>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px", marginBottom: 16 }}>
            Des données officielles, ouvertes et gratuites
          </h2>
          <p style={{ fontSize: 15, color: "#4a6a6a", lineHeight: 1.8, marginBottom: 24 }}>
            contrats_qc utilise exclusivement les données ouvertes du SEAO (Service électronique d'appels d'offres du Québec), publiées et maintenues par le gouvernement du Québec. Ces données sont publiques, accessibles à tous, et mises à jour quotidiennement.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ padding: "10px 20px", background: "#e6f7f6", border: "1px solid #b3e6e3", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#009991" }}>
              Données SEAO — Québec.ca
            </div>
            <div style={{ padding: "10px 20px", background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
              Licence ouverte gouvernementale
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#00B3A9", padding: "64px 56px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.5px", marginBottom: 14 }}>Rejoignez des dizaines d'entreprises québécoises</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 32 }}>Créez votre compte gratuit en moins d'une minute.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register" style={{ padding: "14px 32px", background: "white", color: "#00B3A9", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
            Commencer gratuitement
          </Link>
          <Link href="/contact" style={{ padding: "14px 32px", background: "transparent", color: "white", borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.4)" }}>
            Nous contacter
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#1b2a4a", padding: "28px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#00B3A9", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800 }}>C</div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>contrats_qc</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© 2026</span>
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
