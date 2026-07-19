"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  LineChart, Line,
} from "recharts"
import AppLayout from "@/components/AppLayout"
import UpgradeGate from "@/components/UpgradeGate"
import { getAccessToken } from "@/context/AuthContext"
import { buildExplorerUrl, categorieCode } from "@/lib/explorerUrl"
import {
  analyticsApi,
  type ProfileKpis, type DeadlinePipeline, type RadarData, type BuyerIntelligence,
  type ReactionWindow, type Trend,
} from "@/api/analytics"
import { BarChartIcon, ClockIcon, CheckCircleIcon, DocumentIcon, TagIcon } from "@/components/icons"

// ── Shared helpers/styling (mirrors the app's established conventions) ──────

function urgencyColor(days: number): string {
  if (days <= 7) return "#dc2626"
  if (days <= 14) return "#d97706"
  return "#4a6a6a"
}

const TEAL_STOPS: [number, string][] = [
  [0, "#eef8f7"], [0.35, "#9fe0d9"], [0.65, "#00B3A9"], [1, "#00655d"],
]
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function tealForRatio(ratio: number): string {
  const r = Math.max(0, Math.min(1, ratio))
  for (let i = 0; i < TEAL_STOPS.length - 1; i++) {
    const [p0, c0] = TEAL_STOPS[i]
    const [p1, c1] = TEAL_STOPS[i + 1]
    if (r >= p0 && r <= p1) {
      const t = p1 === p0 ? 0 : (r - p0) / (p1 - p0)
      const [r0, g0, b0] = hexToRgb(c0)
      const [r1, g1, b1] = hexToRgb(c1)
      const c = (n: number) => Math.round(n).toString(16).padStart(2, "0")
      return `#${c(r0 + (r1 - r0) * t)}${c(g0 + (g1 - g0) * t)}${c(b0 + (b1 - b0) * t)}`
    }
  }
  return TEAL_STOPS[TEAL_STOPS.length - 1][1]
}

function useAnalyticsSection<T>(fetcher: (token: string) => Promise<T>, enabled: boolean) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError("")
    const token = getAccessToken()
    if (!token) { setError("Session expirée."); setLoading(false); return }
    fetcher(token)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message ?? "Erreur de chargement.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { data, loading, error }
}

function SkeletonBlock({ height }: { height: number }) {
  return <div style={{ height, borderRadius: 14, background: "#f0f4f4", animation: "pulse 1.5s ease-in-out infinite" }} />
}

function SectionError({ message }: { message: string }) {
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", color: "#b91c1c", fontSize: 13 }}>
      {message}
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1b2a4a", letterSpacing: "-0.2px", marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#4a6a6a" }}>{subtitle}</p>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: "white", border: "1.5px solid #dce8e8", borderRadius: 14, padding: "20px 22px",
}

// ── Block 1: KPIs "Votre marché" ─────────────────────────────────────────────

function KpisSection({ data, loading, error }: { data: ProfileKpis | null; loading: boolean; error: string }) {
  if (error) return <SectionError message={error} />
  if (loading || !data) {
    return (
      <div className="analytics-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} height={104} />)}
      </div>
    )
  }

  // match=profil, not categorie=[...]: the KPI counts via
  // compatible_contracts_query (expertise-based), which stays the single
  // source of truth for "compatible" even as that rule evolves — a
  // categorie-only link would have to be kept in sync by hand instead.
  const baseFilters = { match: "profil" as const }
  const delta = data.new_this_week - data.new_last_week
  const deltaColor = delta === 0 ? "#8ba5a5" : delta > 0 ? "#16a34a" : "#dc2626"
  const deltaLabel = `${delta >= 0 ? "+" : ""}${delta} vs sem. dernière`

  const cards = [
    {
      label: "Avis compatibles ouverts", value: data.compatible_open.toLocaleString("fr-CA"),
      icon: CheckCircleIcon, color: "#ecfdf5",
      href: buildExplorerUrl(baseFilters),
    },
    {
      label: "Ferment dans 7 jours", value: data.closing_7d.toLocaleString("fr-CA"),
      icon: ClockIcon, color: "#fffbeb",
      href: buildExplorerUrl({ ...baseFilters, closing_within: 7 }),
    },
    {
      label: "Nouveaux cette semaine", value: data.new_this_week.toLocaleString("fr-CA"),
      icon: DocumentIcon, color: "#e6f7f6", sub: deltaLabel, subColor: deltaColor,
      href: buildExplorerUrl({ ...baseFilters, sort: "date_publication" }),
    },
    {
      label: "Part du marché qui vous est éligible", value: `${data.pct_of_market}%`,
      icon: TagIcon, color: "#fdf4ff",
      sub: `sur ${data.total_open.toLocaleString("fr-CA")} avis ouverts`, subColor: "#8ba5a5",
      href: buildExplorerUrl(baseFilters),
    },
  ]

  return (
    <div className="analytics-stats-grid">
      {cards.map(c => (
        <Link key={c.label} href={c.href} style={{ textDecoration: "none" }}>
          <div style={{ ...cardStyle, cursor: "pointer", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#00B3A9")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#dce8e8")}
          >
            <div style={{ width: 40, height: 40, borderRadius: 11, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <c.icon size={19} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-1px", lineHeight: 1, marginBottom: 4 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 12, color: "#8ba5a5", fontWeight: 500 }}>{c.label}</div>
            {c.sub && <div style={{ fontSize: 11.5, fontWeight: 600, color: c.subColor, marginTop: 6 }}>{c.sub}</div>}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Block 2: Pipeline d'échéances ────────────────────────────────────────────

const BUCKET_CLOSING_WITHIN: Record<string, number | undefined> = { "0-7": 7, "8-14": 14, "15-30": 30, "30+": undefined }
const BUCKET_TITLES: Record<string, string> = {
  "0-7": "0–7 jours", "8-14": "8–14 jours", "15-30": "15–30 jours", "30+": "30+ jours",
}

function PipelineSection() {
  const { data, loading, error } = useAnalyticsSection<DeadlinePipeline>(analyticsApi.get_pipeline, true)

  if (error) return <SectionError message={error} />
  if (loading || !data) {
    return (
      <div className="analytics-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} height={220} />)}
      </div>
    )
  }

  return (
    <div className="analytics-stats-grid">
      {data.buckets.map(b => (
        <div key={b.label} style={cardStyle}>
          <Link
            href={buildExplorerUrl({ match: "profil", closing_within: BUCKET_CLOSING_WITHIN[b.label] })}
            style={{ textDecoration: "none" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: urgencyColor(BUCKET_CLOSING_WITHIN[b.label] ?? 999), textTransform: "uppercase", letterSpacing: 0.4 }}>
                {BUCKET_TITLES[b.label]}
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#1b2a4a" }}>{b.count}</span>
            </div>
          </Link>
          {b.preview.length === 0 ? (
            <p style={{ fontSize: 12, color: "#8ba5a5" }}>Aucun avis.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {b.preview.map(item => (
                <Link key={item.id} href={`/explorer/${item.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid #eef2f2" }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600, color: "#1b2a4a", marginBottom: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.titre}
                    </p>
                    <p style={{ fontSize: 10.5, color: "#8ba5a5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.organisation}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Block 3: Radar d'opportunités ────────────────────────────────────────────
// Region columns are capped so the grid fits the page width without its own
// horizontal scrollbar — data.regions already arrives sorted by volume
// (see get_radar_data), so the cut only ever drops the lowest-activity tail.
const RADAR_REGION_LIMIT = 12
const RADAR_LABEL_WIDTH = 190

function RadarSection() {
  const { data, loading, error } = useAnalyticsSection<RadarData>(analyticsApi.get_radar, true)

  if (error) return <SectionError message={error} />
  if (loading || !data) return <SkeletonBlock height={340} />

  if (data.categories.length === 0) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", color: "#8ba5a5", fontSize: 14 }}>
        Aucune catégorie dans votre profil — complétez votre profil pour activer le radar.
      </div>
    )
  }

  const regions = data.regions.slice(0, RADAR_REGION_LIMIT)
  const omittedRegions = data.regions.length - regions.length

  const cellMap = new Map<string, number>()
  let maxCount = 1
  for (const cell of data.cells) {
    cellMap.set(`${cell.categorie} ${cell.region}`, cell.count)
    if (cell.count > maxCount) maxCount = cell.count
  }
  const allCategories = [...data.categories, ...data.adjacent_categories]

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 13, color: "#4a6a6a", marginBottom: 14 }}>
        Vos catégories d'expertise (en priorité) et des catégories voisines — organismes qui achètent aussi ce que vous faites. Cliquez une cellule pour voir les contrats.
      </p>
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(140px, ${RADAR_LABEL_WIDTH}px) repeat(${regions.length}, minmax(0, 1fr))`,
            width: "100%",
          }}
        >
          <div />
          {regions.map(region => (
            <div key={region} style={{
              fontSize: 10.5, fontWeight: 600, color: "#4a6a6a", textAlign: "center",
              padding: "0 2px 8px", writingMode: "vertical-rl", transform: "rotate(180deg)",
              height: 90, display: "flex", alignItems: "flex-end", justifyContent: "center",
              overflow: "hidden",
            }}>
              {region}
            </div>
          ))}

          {allCategories.map(categorie => {
            const isProfile = data.categories.includes(categorie)
            return (
              <div key={categorie} style={{ display: "contents" }}>
                <div style={{
                  fontSize: 12, fontWeight: isProfile ? 700 : 500, padding: "6px 10px 6px 8px",
                  display: "flex", alignItems: "center", gap: 6, lineHeight: 1.25,
                  color: isProfile ? "#1b2a4a" : "#4a6a6a",
                  borderLeft: isProfile ? "3px solid #00B3A9" : "3px dashed #dce8e8",
                  minWidth: 0,
                }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{categorie}</span>
                  {!isProfile && (
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 700, color: "#8ba5a5",
                      background: "#f7fafa", border: "1px solid #eef2f2", borderRadius: 20,
                      padding: "1px 6px", letterSpacing: 0.2, whiteSpace: "nowrap",
                    }}>
                      VOISINE
                    </span>
                  )}
                </div>
                {regions.map(region => {
                  const count = cellMap.get(`${categorie} ${region}`) ?? 0
                  const ratio = count / maxCount
                  const bg = count > 0 ? tealForRatio(ratio) : "#f7fafa"
                  const textColor = count > 0 && ratio > 0.55 ? "white" : "#1b2a4a"
                  const cell = (
                    <div
                      title={`${categorie} · ${region} : ${count} contrat${count !== 1 ? "s" : ""} ouvert${count !== 1 ? "s" : ""}`}
                      style={{
                        margin: 2, height: 40, borderRadius: 6, background: bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: textColor,
                        cursor: count > 0 ? "pointer" : "default",
                        transition: "transform 0.1s",
                      }}
                      onMouseEnter={e => { if (count > 0) e.currentTarget.style.transform = "scale(1.08)" }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  )
                  return count > 0 ? (
                    <Link key={region} href={buildExplorerUrl({ categorie: [categorieCode(categorie)], region: [region] })} style={{ textDecoration: "none" }}>
                      {cell}
                    </Link>
                  ) : <div key={region}>{cell}</div>
                })}
              </div>
            )
          })}
        </div>
      </div>
      {omittedRegions > 0 && (
        <p style={{ fontSize: 11.5, color: "#8ba5a5", marginTop: 10 }}>
          + {omittedRegions} autre{omittedRegions !== 1 ? "s" : ""} région{omittedRegions !== 1 ? "s" : ""} avec moins d'activité —{" "}
          <Link href={buildExplorerUrl({ match: "profil" })} style={{ color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>
            voir dans l'Explorateur
          </Link>
        </p>
      )}
    </div>
  )
}

// ── Block 4: Intelligence acheteurs (profil + signaux compétitifs) ──────────

const PRESSENTI_WARNING_THRESHOLD = 30

function BuyersSection() {
  const { data, loading, error } = useAnalyticsSection<BuyerIntelligence>(analyticsApi.get_buyers, true)

  if (error) return <SectionError message={error} />
  if (loading || !data) return <SkeletonBlock height={340} />

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 13, color: "#4a6a6a", marginBottom: 14 }}>
        Organismes qui publient le plus d'avis compatibles avec votre profil, en ce moment.
      </p>
      {data.organizations.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8ba5a5" }}>Aucun organisme trouvé.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.organizations.map(org => {
            const flagged = org.pressenti_pct >= PRESSENTI_WARNING_THRESHOLD
            return (
              <Link
                key={org.organisation}
                href={buildExplorerUrl({ organisation: [org.organisation], match: "profil" })}
                style={{ textDecoration: "none" }}
              >
                <div style={{ padding: "11px 13px", borderRadius: 10, border: "1px solid #eef2f2" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1b2a4a" }}>{org.organisation}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {flagged && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: "#92400e", background: "#fffbeb",
                          border: "1px solid #fde68a", borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap",
                        }}>
                          ⚠ {org.pressenti_pct}% pressenti
                        </span>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#00786f" }}>{org.open_count} avis</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {org.categories.map(c => (
                      <span key={c.categorie} style={{
                        fontSize: 10.5, fontWeight: 500, color: "#4a6a6a", background: "#f7fafa",
                        border: "1px solid #eef2f2", borderRadius: 20, padding: "2px 9px",
                      }}>
                        {c.categorie} ({c.count})
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Block 5: Fenêtre de réaction ─────────────────────────────────────────────

function daysToWeeksLabel(days: number): string {
  const weeks = Math.round(days / 7 * 10) / 10
  return `~${weeks} semaine${weeks >= 2 ? "s" : ""}`
}

function ReactionSection() {
  const { data, loading, error } = useAnalyticsSection<ReactionWindow>(analyticsApi.get_reaction, true)

  if (error) return <SectionError message={error} />
  if (loading || !data) return <SkeletonBlock height={260} />

  if (data.categories.length === 0) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", color: "#8ba5a5", fontSize: 14 }}>
        Pas assez de données pour vos catégories.
      </div>
    )
  }

  const shortest = data.categories[0]
  const chartData = data.categories.map(c => ({ ...c, label: c.categorie }))

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 13, color: "#1b2a4a", marginBottom: 14 }}>
        <b>{shortest.categorie}</b> : {Math.round(shortest.median_days)} jours — vous avez {daysToWeeksLabel(shortest.median_days)} pour réagir.
        {data.market_median_days !== null && (
          <span style={{ color: "#8ba5a5" }}> Médiane marché : {Math.round(data.market_median_days)} jours.</span>
        )}
      </p>
      {/* minWidth: Recharts' ResizeObserver can read the container as 0px on
          the very first layout pass inside this flex-based page shell and
          never recovers on its own — a floor width keeps the chart from
          collapsing (and forcing page overflow) when that happens. */}
      <ResponsiveContainer width="100%" minWidth={280} height={Math.max(180, chartData.length * 46)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#8ba5a5" }} unit="j" />
          <YAxis type="category" dataKey="label" width={220} tick={{ fontSize: 11, fill: "#1b2a4a" }} />
          <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} jours`, "Délai médian"]} />
          {data.market_median_days !== null && (
            <ReferenceLine
              x={data.market_median_days} stroke="#8ba5a5" strokeDasharray="4 4"
              label={{ value: "Médiane marché", position: "top", fontSize: 10.5, fill: "#8ba5a5" }}
            />
          )}
          <Bar dataKey="median_days" fill="#00B3A9" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Block 6: Tendance ─────────────────────────────────────────────────────────

function TrendSection() {
  const { data, loading, error } = useAnalyticsSection<Trend | null>(analyticsApi.get_trend, true)

  if (error) return <SectionError message={error} />
  if (loading) return <SkeletonBlock height={260} />
  if (!data || data.weeks.length === 0) return null

  const chartData = data.weeks.map(w => ({
    label: w.weeks_ago === 0 ? "Cette sem." : `-${w.weeks_ago}sem`,
    profile: w.profile_count, market: w.market_count,
  }))

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: "#4a6a6a" }}>Nouveaux avis compatibles par semaine (12 dernières semaines).</p>
        <Link href={buildExplorerUrl({ match: "profil", sort: "date_publication" })} style={{ fontSize: 12.5, color: "#00B3A9", fontWeight: 600, textDecoration: "none" }}>
          Voir dans l'Explorateur →
        </Link>
      </div>
      <ResponsiveContainer width="100%" minWidth={280} height={240}>
        <LineChart data={chartData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#8ba5a5" }} />
          <YAxis tick={{ fontSize: 11, fill: "#8ba5a5" }} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="market" name="Marché" stroke="#c0d4d4" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="profile" name="Compatible avec vous" stroke="#00B3A9" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyProfileState() {
  return (
    <div style={{
      textAlign: "center", padding: "72px 32px",
      border: "1.5px dashed #dce8e8", borderRadius: 14,
      color: "#8ba5a5", fontSize: 14,
    }}>
      <p style={{ marginBottom: 14 }}>
        Aucun avis ouvert ne correspond à votre profil pour l'instant — ou votre profil n'a pas encore de domaine d'expertise.
      </p>
      <Link href="/profile" style={{
        display: "inline-block", padding: "11px 24px", background: "#00B3A9", color: "white",
        borderRadius: 10, fontSize: 13.5, fontWeight: 700, textDecoration: "none",
      }}>
        Complétez votre profil pour activer l'analytique
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalyticsContent() {
  const kpis = useAnalyticsSection<ProfileKpis>(analyticsApi.get_kpis, true)
  const profileReady = kpis.data?.profile_ready ?? false
  const showEmptyState = !kpis.loading && !kpis.error && kpis.data && !profileReady

  return (
    <div style={{ padding: "32px 32px 64px", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        /* minmax(0, 1fr), not a bare 1fr: a plain "1fr" track has an implicit
           automatic minimum equal to its content's min-content width, so one
           long unbreakable string (an org name, a contract title) forces the
           whole grid — and everything above it in the DOM — wider than the
           viewport instead of letting text-overflow/ellipsis do its job. */
        .analytics-stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 900px) {
          .analytics-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .analytics-stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <BarChartIcon size={22} />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1b2a4a", letterSpacing: "-0.5px" }}>Analytique</h1>
        </div>
        <p style={{ fontSize: 14, color: "#4a6a6a" }}>
          Où sont vos opportunités, et combien de temps vous avez pour réagir.
        </p>
      </div>

      <div style={{ marginBottom: 36 }}>
        <SectionTitle title="Votre marché" subtitle="Les avis ouverts compatibles avec votre profil d'entreprise." />
        <KpisSection data={kpis.data} loading={kpis.loading} error={kpis.error} />
      </div>

      {showEmptyState ? (
        <EmptyProfileState />
      ) : profileReady ? (
        <>
          <div style={{ marginBottom: 36 }}>
            <SectionTitle title="Pipeline d'échéances" subtitle="Ce qu'il faut faire cette semaine vs ce mois-ci." />
            <PipelineSection />
          </div>

          <div style={{ marginBottom: 36 }}>
            <SectionTitle title="Radar d'opportunités" subtitle="Où sont les contrats ouverts, dans vos catégories et les catégories voisines." />
            <RadarSection />
          </div>

          <div style={{ marginBottom: 36 }}>
            <SectionTitle title="Intelligence acheteurs" subtitle="Les organismes qui achètent ce que vous faites." />
            <BuyersSection />
          </div>

          <div style={{ marginBottom: 36 }}>
            <SectionTitle title="Fenêtre de réaction" subtitle="Combien de temps entre la publication et la fermeture, pour vos catégories." />
            <ReactionSection />
          </div>

          <TrendSection />
        </>
      ) : null}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <UpgradeGate
        feature="Analytique — vos opportunités, pas le marché"
        description="Voyez exactement où sont les avis compatibles avec votre profil, combien de temps vous avez pour soumissionner, et qui achète ce que vous faites."
        benefits={[
          "KPIs et pipeline d'échéances calculés sur votre profil, pas le marché global",
          "Radar d'opportunités : vos catégories + suggestions de catégories voisines",
          "Organismes acheteurs avec alerte fournisseur pressenti intégrée",
          "Fenêtre de réaction par catégorie, comparée à la médiane du marché",
        ]}
      >
        <AnalyticsContent />
      </UpgradeGate>
    </AppLayout>
  )
}
