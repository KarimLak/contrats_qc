"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import AppLayout from "@/components/AppLayout"
import { contractApi, type Contract } from "@/api/contract"

const MONTHS_FR = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"]

function fmtDate(raw: string | null): string {
  if (!raw) return "—"
  const [y, m, d] = raw.split(" ")[0].split("-")
  return `${parseInt(d)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

function daysLeft(raw: string | null): number | null {
  if (!raw) return null
  const closing = new Date(raw.split(" ")[0])
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((closing.getTime() - today.getTime()) / 86_400_000)
}

function urgencyColor(days: number): string {
  if (days <= 3) return "#dc2626"
  if (days <= 7) return "#d97706"
  return "#16a34a"
}

function urgencyBg(days: number): { bg: string; border: string } {
  if (days <= 3) return { bg: "#fef2f2", border: "#fecaca" }
  if (days <= 7) return { bg: "#fffbeb", border: "#fed7aa" }
  return { bg: "#f0fdf4", border: "#bbf7d0" }
}

function statusBadgeStyle(statut: string): React.CSSProperties {
  const map: Record<string, { color: string; bg: string }> = {
    "Publié":           { color: "#15803d", bg: "#dcfce7" },
    "Annulé":           { color: "#dc2626", bg: "#fee2e2" },
    "Terminé":          { color: "#6b7280", bg: "#f3f4f6" },
    "Contrat conclu":   { color: "#7c3aed", bg: "#ede9fe" },
    "Liste disponible": { color: "#0891b2", bg: "#e0f2fe" },
  }
  const s = map[statut] ?? { color: "#1d4ed8", bg: "#dbeafe" }
  return { color: s.color, background: s.bg }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white",
      border: "1.5px solid #dce8e8",
      borderRadius: 14,
      padding: "20px 24px",
      marginBottom: 12,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: "#8ba5a5",
        letterSpacing: 0.8, textTransform: "uppercase",
        marginBottom: 14,
      }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 9, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "#8ba5a5", minWidth: 150, flexShrink: 0, paddingTop: 1, lineHeight: 1.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#1b2a4a", fontWeight: 500, lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <div style={{ height: 24, width: 160, borderRadius: 8, background: "#f0f4f4", marginBottom: 28, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 190, borderRadius: 16, background: "#f0f4f4", marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[200, 160, 120].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 14, background: "#f0f4f4", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[160, 140, 100].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 14, background: "#f0f4f4", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailContent() {
  const params  = useParams()
  const id      = Number(params.id as string)

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  useEffect(() => {
    contractApi.get_contract(id)
      .then(setContract)
      .catch(e => setError(e.message ?? "Contrat introuvable."))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <DetailSkeleton />

  if (error) {
    return (
      <div style={{ padding: "32px", fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <Link href="/explorer" style={{ fontSize: 13, color: "#4a6a6a", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24, fontWeight: 500 }}>
          ← Retour à l'explorateur
        </Link>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "20px 24px", color: "#b91c1c", fontSize: 14, marginTop: 16 }}>
          {error}
        </div>
      </div>
    )
  }

  if (!contract) return null

  const c    = contract
  const days = daysLeft(c.date_fermeture)
  const badge = statusBadgeStyle(c.statut)

  const hasTerms     = c.duree_contrat || c.duree_contrat_avec_options || c.options_renouvellement || c.contrat_a_commandes || c.contrat_execution_demande
  const hasLogistics = c.soumission_electronique || c.endroit_reception || c.endroit_ouverture || c.adjudication_par_lot
  const hasGuarantee = c.garantie_nature || c.garantie_valeur || c.fournisseur_pressenti
  const hasContact   = c.contact_nom || c.contact_email || c.contact_telephone
  const hasGeo       = c.accord || c.territoires

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link href="/explorer" style={{
          fontSize: 13, color: "#4a6a6a", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
          fontWeight: 500, transition: "color 0.15s",
        }}>
          ← Retour à l'explorateur
        </Link>
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "9px 20px", background: "#00B3A9", color: "white",
            textDecoration: "none", borderRadius: 10, fontSize: 13,
            fontWeight: 600, fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(0,179,169,0.3)",
          }}
        >
          Voir sur SEAO ↗
        </a>
      </div>

      {/* Hero card */}
      <div style={{
        background: "white", border: "1.5px solid #dce8e8",
        borderRadius: 16, padding: "28px 32px", marginBottom: 12,
        boxShadow: "0 4px 32px rgba(27,42,74,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>

          {/* Left: title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span style={{ ...badge, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.3 }}>
                {c.statut}
              </span>
              {c.type_avis && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#4a6a6a", background: "#f7fafa", border: "1.5px solid #dce8e8", padding: "3px 10px", borderRadius: 20 }}>
                  {c.type_avis}
                </span>
              )}
              {c.nature_contrat && (
                <span style={{ fontSize: 11, fontWeight: 500, color: "#8ba5a5", padding: "3px 0" }}>
                  {c.nature_contrat}
                </span>
              )}
            </div>

            <h1 style={{
              fontSize: 22, fontWeight: 800, color: "#1b2a4a",
              letterSpacing: "-0.3px", lineHeight: 1.35, marginBottom: 8,
            }}>
              {c.titre}
            </h1>

            <p style={{ fontSize: 15, color: "#4a6a6a", fontWeight: 500, marginBottom: 20 }}>
              {c.organisation}
            </p>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#4a6a6a" }}>
              {c.region && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#b3e6e3" }}>📍</span>{c.region}
                </span>
              )}
              {c.categorie && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#b3e6e3" }}>🗂</span>
                  {c.categorie.length > 55 ? c.categorie.slice(0, 55) + "…" : c.categorie}
                </span>
              )}
              {c.numero && (
                <span style={{ color: "#8ba5a5", fontSize: 12, fontFamily: "monospace" }}>
                  #{c.numero}
                </span>
              )}
            </div>
          </div>

          {/* Right: countdown */}
          {days !== null && (
            <div style={{
              flexShrink: 0,
              background: urgencyBg(days).bg,
              border: `1.5px solid ${urgencyBg(days).border}`,
              borderRadius: 14, padding: "16px 22px",
              textAlign: "center", minWidth: 110,
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: urgencyColor(days), lineHeight: 1 }}>
                {days > 0 ? days : 0}
              </div>
              <div style={{ fontSize: 10, color: urgencyColor(days), fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}>
                {days > 0 ? "JOURS REST." : days === 0 ? "AUJOURD'HUI" : "EXPIRÉ"}
              </div>
              {c.date_fermeture && (
                <div style={{ fontSize: 11, color: "#8ba5a5", marginTop: 10, borderTop: "1px solid #dce8e8", paddingTop: 8 }}>
                  {fmtDate(c.date_fermeture)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body: two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, alignItems: "start" }}>

        {/* LEFT column */}
        <div>
          {c.description && (
            <Section title="Description">
              <p style={{ fontSize: 14, color: "#4a6a6a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {c.description}
              </p>
            </Section>
          )}

          {hasLogistics && (
            <Section title="Logistique de soumission">
              <Row label="Soumission électronique" value={c.soumission_electronique} />
              <Row label="Endroit de réception"    value={c.endroit_reception} />
              <Row label="Endroit d'ouverture"     value={c.endroit_ouverture} />
              <Row label="Adjudication par lot"    value={c.adjudication_par_lot} />
            </Section>
          )}

          {c.remarque && (
            <Section title="Remarques">
              <p style={{ fontSize: 13, color: "#4a6a6a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {c.remarque}
              </p>
            </Section>
          )}

          {c.documents.length > 0 && (
            <Section title={`Documents · ${c.documents.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {c.documents.map((doc, i) => (
                  <div key={i} style={{
                    background: "#f7fafa", border: "1.5px solid #dce8e8",
                    borderRadius: 10, padding: "12px 16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {doc.titre && (
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1b2a4a", marginBottom: 3 }}>
                            {doc.titre}
                          </p>
                        )}
                        {doc.contenu && (
                          <p style={{ fontSize: 12, color: "#4a6a6a" }}>{doc.contenu}</p>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {doc.type && <p style={{ fontSize: 11, color: "#8ba5a5", marginBottom: 2 }}>{doc.type}</p>}
                        {doc.langue && <p style={{ fontSize: 11, color: "#8ba5a5", marginBottom: 2 }}>{doc.langue}</p>}
                        {doc.nombre_page && <p style={{ fontSize: 11, color: "#8ba5a5" }}>{doc.nombre_page} p.</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {c.classifications.length > 0 && (
            <Section title="Classifications">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.classifications.map((cl, i) => (
                  <span key={i} style={{
                    fontSize: 12, color: "#00B3A9",
                    background: "rgba(0,179,169,0.08)",
                    border: "1.5px solid #b3e6e3",
                    padding: "4px 12px", borderRadius: 20, fontWeight: 500,
                  }}>
                    {cl}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT column */}
        <div>
          <Section title="Dates clés">
            <Row label="Publication"          value={fmtDate(c.date_publication)} />
            {c.date_fermeture             && <Row label="Fermeture"               value={fmtDate(c.date_fermeture)} />}
            {c.date_limite_interet        && <Row label="Limite d'intérêt"        value={fmtDate(c.date_limite_interet)} />}
            {c.date_limite_plaintes       && <Row label="Limite de plaintes"      value={fmtDate(c.date_limite_plaintes)} />}
            {c.date_ouverture_soumissions && <Row label="Ouverture soumissions"   value={fmtDate(c.date_ouverture_soumissions)} />}
            {c.date_conclusion            && <Row label="Conclusion"              value={fmtDate(c.date_conclusion)} />}
          </Section>

          {hasTerms && (
            <Section title="Modalités du contrat">
              <Row label="Durée"                  value={c.duree_contrat} />
              <Row label="Durée avec options"     value={c.duree_contrat_avec_options} />
              <Row label="Renouvellement"         value={c.options_renouvellement} />
              <Row label="Contrat à commandes"    value={c.contrat_a_commandes} />
              <Row label="Exécution sur demande"  value={c.contrat_execution_demande} />
            </Section>
          )}

          {hasGeo && (
            <Section title="Géographie & accords">
              <Row label="Accord commercial" value={c.accord} />
              <Row label="Territoires"       value={c.territoires} />
            </Section>
          )}

          {hasGuarantee && (
            <Section title="Garantie & fournisseur">
              <Row label="Nature de la garantie" value={c.garantie_nature} />
              <Row label="Valeur de la garantie" value={c.garantie_valeur} />
              <Row label="Fournisseur pressenti" value={c.fournisseur_pressenti} />
            </Section>
          )}

          {hasContact && (
            <Section title="Contact">
              <Row label="Nom"       value={c.contact_nom} />
              <Row label="Courriel"  value={c.contact_email} />
              <Row label="Téléphone" value={c.contact_telephone} />
            </Section>
          )}

          <Section title="Références">
            <Row label="Numéro"            value={c.numero} />
            <Row label="Numéro référence"  value={c.numero_reference} />
          </Section>
        </div>
      </div>
    </div>
  )
}

export default function ContractDetailPage() {
  return (
    <AppLayout>
      <DetailContent />
    </AppLayout>
  )
}
