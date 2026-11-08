"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe2,
  Info,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Printer,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ScoreRing } from "@/components/score-ring";
import { ReScanButton, SampleButton } from "@/components/scan";
import { exportCsv, exportJson, copyText } from "@/lib/export";
import {
  CATEGORY_KEYS,
  CATEGORY_META,
  scoreColor,
  shortScoreLabel,
  type AuditCheck,
  type CategoryKey,
  type CheckStatus,
  type FullReport,
  type Scores,
} from "@/lib/types";

type TabId = "overview" | "recommendations" | CategoryKey | "evidence";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "recommendations", label: "Action plan", icon: ListChecks },
  { id: "performance", label: "Performance", icon: Lightbulb },
  { id: "seo", label: "SEO", icon: Globe2 },
  { id: "accessibility", label: "Accessibility", icon: CheckCircle2 },
  { id: "security", label: "Security", icon: ShieldAlert },
  { id: "content", label: "Content", icon: FileText },
  { id: "mobile", label: "Mobile", icon: Database },
  { id: "evidence", label: "Evidence & limits", icon: Info },
];

const STATUS_ICON: Record<CheckStatus, LucideIcon> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  info: Info,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RadarChart({ scores }: { scores: Scores }) {
  const center = { x: 165, y: 138 };
  const radius = 88;
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / CATEGORY_KEYS.length - Math.PI / 2;
    const distance = (radius * value) / 100;
    return `${(center.x + Math.cos(angle) * distance).toFixed(1)},${(center.y + Math.sin(angle) * distance).toFixed(1)}`;
  };
  const polygon = (value: number) =>
    CATEGORY_KEYS.map((_, index) => point(index, value)).join(" ");
  const dataPolygon = CATEGORY_KEYS.map((key, index) => point(index, scores[key])).join(" ");
  return (
    <svg viewBox="0 0 330 280" width="100%" height="260" role="img" aria-label="Radar chart of six category scores">
      {[25, 50, 75, 100].map((level) => (
        <polygon key={level} points={polygon(level)} fill="none" stroke="#DFE3D8" strokeWidth="1" />
      ))}
      {CATEGORY_KEYS.map((key, index) => {
        const [x, y] = point(index, 100).split(",").map(Number);
        return <line key={key} x1={center.x} y1={center.y} x2={x} y2={y} stroke="#DFE3D8" strokeWidth="1" />;
      })}
      <polygon points={dataPolygon} fill="rgba(15,114,92,.20)" stroke="#0F725C" strokeWidth="2.5" />
      {CATEGORY_KEYS.map((key, index) => {
        const angle = (Math.PI * 2 * index) / CATEGORY_KEYS.length - Math.PI / 2;
        const x = center.x + Math.cos(angle) * (radius + 26);
        const y = center.y + Math.sin(angle) * (radius + 20);
        return (
          <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#62746B" fontFamily="var(--font-sans)">
            {CATEGORY_META[key].short} {scores[key]}
          </text>
        );
      })}
    </svg>
  );
}

function CheckRow({ check }: { check: AuditCheck }) {
  const Icon = STATUS_ICON[check.status];
  return (
    <div className="check-row">
      <span className={`check-status ${check.status}`}><Icon size={14} /></span>
      <div className="check-body">
        <strong>{check.label}</strong>
        <p>{check.detail}</p>
        {check.evidence && <p><code>{check.evidence}</code></p>}
        {check.fix && check.status !== "pass" && (
          <p style={{ marginTop: 8, color: "var(--ink-2)" }}>
            <b>Suggested fix:</b> {check.fix}
          </p>
        )}
      </div>
      <div className="check-right">
        <span className={`pill ${check.status === "pass" ? "good" : check.status === "warn" ? "warn" : check.status === "fail" ? "bad" : "info"}`}>
          {check.status}
        </span>
        {check.status !== "info" && <span className="muted mono" style={{ fontSize: 10 }}>weight {check.weight}</span>}
      </div>
    </div>
  );
}

export function ReportWorkspace({ report }: { report: FullReport }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [openRec, setOpenRec] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const payload = report.payload;

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  function exportAction(action: () => void, message: string) {
    action();
    setExportOpen(false);
    notify(message);
  }

  const failing = payload.checks.filter((check) => check.status === "fail");
  const warning = payload.checks.filter((check) => check.status === "warn");
  const passing = payload.checks.filter((check) => check.status === "pass");

  function CategoryPanel({ category }: { category: CategoryKey }) {
    const checks = payload.checks.filter((check) => check.category === category);
    return (
      <div className="report-stack">
        <div className="panel">
          <div className="panel-head" style={{ alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <ScoreRing score={payload.scores[category]} size={82} />
              <div>
                <h2>{CATEGORY_META[category].label}</h2>
                <p className="panel-sub">{CATEGORY_META[category].description}</p>
                <p className="panel-sub" style={{ marginTop: 8 }}>
                  Weighted from {checks.filter((c) => c.status !== "info").length} measured checks · contributes {Math.round(CATEGORY_META[category].weight * 100)}% to the overall score.
                </p>
              </div>
            </div>
          </div>
          <div className="check-list">
            {checks.map((check) => <CheckRow key={`${category}-${check.id}`} check={check} />)}
          </div>
        </div>

        {category === "performance" && (
          <div className="panel">
            <div className="panel-head"><div><h2>Measured delivery metrics</h2><p className="panel-sub">Values captured from the HTTP response and HTML source.</p></div></div>
            <div className="metric-grid">
              {payload.metrics.map((metric) => (
                <div className="metric-tile" key={metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value" style={{ color: metric.state === "good" ? "#126b54" : metric.state === "bad" ? "#b3483f" : metric.state === "warn" ? "#b57a19" : "var(--ink)" }}>{metric.value}</div>
                  <div className="metric-note">{metric.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {category === "security" && (
          <div className="panel">
            <div className="panel-head"><div><h2>Response header evidence</h2><p className="panel-sub">Observed directly on the final HTTP response.</p></div></div>
            <div className="metric-grid">
              {Object.entries(payload.securityHeaders).map(([key, value]) => (
                <div className="metric-tile" key={key}>
                  <div className="metric-label">{key.replace(/([A-Z])/g, " $1")}</div>
                  <div className="metric-value" style={{ fontSize: 15, color: value === true ? "#126b54" : value === false ? "#b3483f" : "var(--ink)" }}>
                    {typeof value === "boolean" ? (value ? "Present" : "Absent") : String(value || "Not disclosed")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(category === "seo" || category === "content") && (
          <div className="panel">
            <div className="panel-head"><div><h2>Extracted page facts</h2><p className="panel-sub">Parsed from the document, not inferred from a screenshot.</p></div></div>
            <div className="table-wrap">
              <table className="data-table">
                <tbody>
                  <tr><th>Title</th><td>{payload.page.title || "—"}</td></tr>
                  <tr><th>Meta description</th><td>{payload.page.description || "—"}</td></tr>
                  <tr><th>Canonical</th><td className="mono" style={{ fontSize: 11 }}>{payload.page.canonical || "—"}</td></tr>
                  <tr><th>Language / H1</th><td>{payload.page.language || "—"} · {payload.page.h1[0] || "—"}</td></tr>
                  <tr><th>Structure</th><td>{payload.page.headingCount} headings · {payload.page.linkCount} links · {payload.page.imageCount} images · {payload.page.scriptCount} scripts</td></tr>
                  <tr><th>Content</th><td>{payload.page.wordCount} words · {payload.page.textRatio}% text ratio · {payload.page.jsonLdBlocks} JSON-LD blocks · {payload.page.ogTags} OG tags</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Overview() {
    return (
      <div className="report-stack">
        <div className="panel panel-dark" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 26, alignItems: "start" }}>
          <ScoreRing score={payload.scores.overall} size={128} stroke={9} invert label="overall" />
          <div>
            <span className="eyebrow on-dark">Signal summary · {payload.summarySource === "ai" ? "AI-assisted narrative" : "deterministic engine"}</span>
            <p className="summary-text" style={{ marginTop: 14 }}>{payload.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              <span className="pill info">{payload.sourceLabel}</span>
              <span className="pill info">Engine v{payload.engineVersion}</span>
              <span className="pill info">HTTP {payload.statusCode}</span>
              <span className="pill info">{payload.checks.filter((c) => c.status !== "info").length} scored checks</span>
            </div>
          </div>
        </div>

        <div className="category-grid">
          {CATEGORY_KEYS.map((key) => (
            <button key={key} className="card score-card" style={{ textAlign: "left" }} onClick={() => setTab(key)}>
              <ScoreRing score={payload.scores[key]} size={62} stroke={6} label="" />
              <div className="score-meta" style={{ minWidth: 0, flex: 1 }}>
                <strong>{CATEGORY_META[key].short}</strong>
                <span>{shortScoreLabel(payload.scores[key])} · {Math.round(CATEGORY_META[key].weight * 100)}% weight</span>
                <div className="bar-track" style={{ marginTop: 9 }}><i style={{ width: `${payload.scores[key]}%`, background: scoreColor(payload.scores[key]) }} /></div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid-2">
          <div className="panel">
            <div className="panel-head"><div><h2>Category profile</h2><p className="panel-sub">Relative strength across the six measured dimensions.</p></div></div>
            <RadarChart scores={payload.scores} />
          </div>
          <div className="panel">
            <div className="panel-head"><div><h2>Measured signals</h2><p className="panel-sub">Captured during this scan.</p></div></div>
            <div className="metric-grid">
              {payload.metrics.slice(0, 8).map((metric) => (
                <div className="metric-tile" key={metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-note">{metric.note}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
              <span className="pill good">{passing.length} passed</span>
              <span className="pill warn">{warning.length} cautionary</span>
              <span className="pill bad">{failing.length} failing</span>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="panel" style={{ borderColor: "#f1d5d2" }}>
            <div className="panel-head"><div><h2>Critical findings</h2><p className="panel-sub">Failing signals, sorted by weight.</p></div><XCircle size={18} color="#b3483f" /></div>
            {failing.length ? (
              <div className="check-list">
                {failing.sort((a, b) => b.weight - a.weight).slice(0, 4).map((check) => <CheckRow key={check.id} check={check} />)}
              </div>
            ) : <p className="panel-sub">No failing signals were measured in this scan.</p>}
          </div>
          <div className="panel" style={{ borderColor: "#cfe4d8" }}>
            <div className="panel-head"><div><h2>Quick wins</h2><p className="panel-sub">Low-effort fixes with practical impact.</p></div><CheckCircle2 size={18} color="#126b54" /></div>
            {payload.quickWins.length ? (
              <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 12 }}>
                {payload.quickWins.map((item, index) => (
                  <li key={index} style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink-2)" }}>{item}</li>
                ))}
              </ol>
            ) : <p className="panel-sub">No easy quick wins were identified.</p>}
            <button className="btn-outline btn-sm" style={{ marginTop: 18 }} onClick={() => setTab("recommendations")}>
              Open full action plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Recommendations() {
    return (
      <div className="report-stack">
        <div className="panel panel-dark">
          <span className="eyebrow on-dark">Two-hour action plan</span>
          <h2 style={{ fontSize: 22, marginTop: 12 }}>If you only have limited time, start here.</h2>
          <p className="panel-sub" style={{ maxWidth: 640 }}>These are the highest-priority low-effort fixes from this scan. Every item is derived from a failing or cautionary check.</p>
          <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
            {payload.quickWins.map((item, index) => (
              <div key={index} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 14 }}>
                <span className="rec-index" style={{ background: "var(--accent-bright)", color: "var(--ink)" }}>{index + 1}</span>
                <span style={{ fontSize: 13, lineHeight: 1.65 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div><h2>Prioritized remediation plan</h2><p className="panel-sub">{payload.recommendations.length} recommendations, ordered by severity and signal weight.</p></div>
            <button className="btn-outline btn-sm" onClick={() => exportCsv(report)}><FileSpreadsheet size={14} /> CSV</button>
          </div>
          {payload.recommendations.map((item, index) => (
            <div className="rec-item" key={`${item.category}-${item.id}`}>
              <button className="rec-trigger" aria-expanded={openRec === `${item.category}-${item.id}`} onClick={() => setOpenRec(openRec === `${item.category}-${item.id}` ? null : `${item.category}-${item.id}`)}>
                <span className="rec-index">{index + 1}</span>
                <span style={{ flex: 1 }}>
                  <span className="rec-title">{item.title}</span>
                  <span className="rec-meta">
                    <span className={`pill ${item.priority === "high" ? "bad" : item.priority === "medium" ? "warn" : "neutral"}`}>{item.priority} priority</span>
                    <span className="pill neutral">{item.effort} effort</span>
                    <span className="pill neutral">{CATEGORY_META[item.category].short}</span>
                  </span>
                </span>
                <ChevronDown size={16} className="muted" style={{ transform: openRec === `${item.category}-${item.id}` ? "rotate(180deg)" : undefined }} />
              </button>
              {openRec === `${item.category}-${item.id}` && (
                <div className="rec-detail">
                  <div><strong>Why it matters</strong><p>{item.why}</p></div>
                  <div><strong>Suggested fix</strong><p>{item.fix}</p></div>
                  <div><strong>Expected impact</strong><p>{item.impact}</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Evidence() {
    return (
      <div className="report-stack">
        <div className="panel">
          <div className="panel-head"><div><h2>Scan provenance</h2><p className="panel-sub">Everything needed to reproduce or challenge this report.</p></div></div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                <tr><th>Requested URL</th><td className="mono" style={{ fontSize: 11 }}>{payload.normalizedUrl}</td></tr>
                <tr><th>Final URL</th><td className="mono" style={{ fontSize: 11 }}>{payload.finalUrl}</td></tr>
                <tr><th>Analyzed at</th><td>{formatDate(payload.analyzedAt)}</td></tr>
                <tr><th>Status / redirects</th><td>HTTP {payload.statusCode} · {payload.metrics.find((m) => m.label === "Redirects")?.value ?? "0"} hops</td></tr>
                <tr><th>Response time</th><td>{payload.metrics.find((m) => m.label === "Response time")?.value ?? "—"}</td></tr>
                <tr><th>Engine / source</th><td>v{payload.engineVersion} · {payload.sourceLabel}</td></tr>
                <tr><th>Report ID</th><td className="mono" style={{ fontSize: 11 }}>{report.id}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><h2>Optional Google Lighthouse data</h2><p className="panel-sub">Separate from the built-in heuristic scores. Only available when a PageSpeed Insights key is configured.</p></div></div>
          {payload.lighthouse ? (
            <>
              <div className="category-grid">
                {(["performance", "accessibility", "seo", "bestPractices"] as const).map((key) => (
                  <div className="metric-tile" key={key}>
                    <div className="metric-label">{key === "bestPractices" ? "Best practices" : key}</div>
                    <div className="metric-value" style={{ color: scoreColor(payload.lighthouse![key]) }}>{payload.lighthouse![key]}</div>
                    <div className="metric-note">{payload.lighthouse!.strategy} strategy</div>
                  </div>
                ))}
              </div>
              <div className="check-list" style={{ marginTop: 16 }}>
                {payload.lighthouse.metrics.map((metric) => (
                  <div className="check-row" key={metric.label}>
                    <span className="check-status info"><Info size={14} /></span>
                    <div className="check-body"><strong>{metric.label}</strong><p>Display value: {metric.value}</p></div>
                    <span className="pill neutral">{metric.score ?? "—"}/100</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="panel-sub">Not configured for this deployment. Set <code>PAGESPEED_API_KEY</code> to attach official Lighthouse lab results alongside the local evidence. No key is required for core functionality.</p>
          )}
        </div>

        {payload.warnings.length > 0 && (
          <div className="panel">
            <div className="panel-head"><div><h2>Scan notes</h2><p className="panel-sub">Conditions that may affect interpretation.</p></div><AlertTriangle size={18} color="#b57a19" /></div>
            <div style={{ display: "grid", gap: 9 }}>
              {payload.warnings.map((note, index) => (
                <div key={index} className="pill warn" style={{ justifyContent: "flex-start", borderRadius: 10, padding: "10px 12px", fontWeight: 500, lineHeight: 1.5 }}>{note}</div>
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-head"><div><h2>Known boundaries of this audit</h2><p className="panel-sub">Read these before sharing the report with stakeholders.</p></div></div>
          <ul className="limitation-list">
            {payload.limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head"><div><h2>Complete check ledger</h2><p className="panel-sub">All {payload.checks.length} checks, including manual-review items. Exportable as CSV.</p></div></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Category</th><th>Check</th><th>Status</th><th>Weight</th><th>Detail</th></tr></thead>
              <tbody>
                {payload.checks.map((check) => (
                  <tr key={`${check.category}-${check.id}`}>
                    <td>{CATEGORY_META[check.category].short}</td>
                    <td style={{ fontWeight: 600 }}>{check.label}</td>
                    <td><span className={`pill ${check.status === "pass" ? "good" : check.status === "warn" ? "warn" : check.status === "fail" ? "bad" : "info"}`}>{check.status}</span></td>
                    <td className="mono">{check.weight}</td>
                    <td className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const activeMeta = tab === "overview" || tab === "recommendations" || tab === "evidence"
    ? null
    : CATEGORY_META[tab];

  return (
    <div className="report-page">
      <div className="report-topbar no-print">
        <div className="shell report-topbar-inner">
          <Brand compact />
          <span style={{ width: 1, height: 24, background: "var(--line)" }} />
          <div className="report-url">
            <Globe2 size={15} />
            <strong>{report.host}</strong>
            <span className="pill info" style={{ fontSize: 10 }}>{payload.source === "fixture" ? "Sample" : "Live"}</span>
            <span style={{ display: "none" }} className="mono">{formatDate(report.createdAt)}</span>
          </div>
          <div className="report-actions">
            <Link href="/reports" className="btn-ghost btn-sm btn-icon" title="All reports" aria-label="All reports"><ArrowLeft size={15} /></Link>
            {payload.source === "live" ? (
              <ReScanButton url={payload.normalizedUrl} className="btn-outline btn-sm" />
            ) : (
              <SampleButton className="btn-outline btn-sm" label="New sample" />
            )}
            <div style={{ position: "relative" }}>
              <button className="btn-primary btn-sm" onClick={() => setExportOpen((value) => !value)} aria-expanded={exportOpen}>
                <Download size={14} /> Export <ChevronDown size={13} />
              </button>
              {exportOpen && (
                <div className="export-popover" role="menu">
                  <button className="menu-item" role="menuitem" onClick={() => exportAction(() => exportJson(report), "JSON report downloaded")}><FileText size={15} /> Full report (JSON)</button>
                  <button className="menu-item" role="menuitem" onClick={() => exportAction(() => exportCsv(report), "Check ledger downloaded")}><FileSpreadsheet size={15} /> Check ledger (CSV)</button>
                  <button className="menu-item" role="menuitem" onClick={() => exportAction(() => window.print(), "Opening print dialog — choose Save as PDF")}><Printer size={15} /> Print / Save as PDF</button>
                  <button className="menu-item" role="menuitem" onClick={() => exportAction(() => { void copyText(window.location.href).then((ok) => notify(ok ? "Shareable link copied" : "Copy failed — use the address bar")); }, "Copying link…")}><Copy size={15} /> Copy share link</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shell report-layout">
        <aside className="report-sidebar no-print">
          <div className="card" style={{ padding: 12 }}>
            <div className="sidebar-title" style={{ marginTop: 2 }}>Analysis</div>
            {TABS.slice(0, 2).map((item) => (
              <button key={item.id} className={`tab-button${tab === item.id ? " active" : ""}`} onClick={() => setTab(item.id)}>
                <item.icon size={15} /> {item.label}
              </button>
            ))}
            <div className="sidebar-title">Score categories</div>
            {CATEGORY_KEYS.map((key) => {
              const item = TABS.find((entry) => entry.id === key)!;
              return (
                <button key={key} className={`tab-button${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                  <item.icon size={15} /> {CATEGORY_META[key].short}
                  <span className="tab-score" style={{ color: tab === key ? "#c9eb67" : scoreColor(payload.scores[key]) }}>{payload.scores[key]}</span>
                </button>
              );
            })}
            <div className="sidebar-title">Audit trail</div>
            {TABS.slice(-1).map((item) => (
              <button key={item.id} className={`tab-button${tab === item.id ? " active" : ""}`} onClick={() => setTab(item.id)}>
                <item.icon size={15} /> {item.label}
              </button>
            ))}
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, padding: "12px 12px 4px", fontSize: 11, lineHeight: 1.6 }} className="muted">
              {formatDate(report.createdAt)}<br />Report #{report.id.slice(0, 8)}
            </div>
          </div>
        </aside>

        <main className="report-main">
          <div className="mobile-tabs no-print">
            {TABS.map((item) => (
              <button key={item.id} className={`tab-button${tab === item.id ? " active" : ""}`} onClick={() => setTab(item.id)}>
                {item.label}{activeMeta && item.id === tab ? ` · ${payload.scores[tab as CategoryKey]}` : ""}
              </button>
            ))}
          </div>

          <div className="report-heading">
            <div>
              <span className="eyebrow">{tab === "overview" ? "Executive view" : tab === "recommendations" ? "Action plan" : tab === "evidence" ? "Audit trail" : CATEGORY_META[tab as CategoryKey].label}</span>
              <h1 style={{ marginTop: 10 }}>
                {tab === "overview" ? `Signal report for ${report.host}` : tab === "recommendations" ? "What to fix, in what order" : tab === "evidence" ? "Evidence & confidence" : CATEGORY_META[tab as CategoryKey].label}
              </h1>
              <p>
                {tab === "overview"
                  ? `${payload.sourceLabel} · ${formatDate(report.createdAt)} · ${payload.checks.length} checks`
                  : tab === "recommendations"
                    ? `${payload.recommendations.length} recommendations derived from measured checks`
                    : tab === "evidence"
                      ? "Provenance, optional integrations, warnings and measurement limits"
                      : `${payload.checks.filter((c) => c.category === tab).length} checks · score ${payload.scores[tab as CategoryKey]}/100`}
              </p>
            </div>
            <a className="btn-ghost btn-sm no-print" href={payload.finalUrl} target="_blank" rel="noopener noreferrer">
              Visit site <ExternalLink size={13} />
            </a>
          </div>

          <div className="fade-in" key={tab}>
            {tab === "overview" && <Overview />}
            {tab === "recommendations" && <Recommendations />}
            {tab === "evidence" && <Evidence />}
            {CATEGORY_KEYS.includes(tab as CategoryKey) && <CategoryPanel category={tab as CategoryKey} />}
          </div>
        </main>
      </div>

      {toast && <div className="toast no-print" role="status">{toast}</div>}
      {exportOpen && <button className="no-print" aria-label="Close export menu" onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 34, background: "transparent", border: "none", cursor: "default" }} />}
    </div>
  );
}
