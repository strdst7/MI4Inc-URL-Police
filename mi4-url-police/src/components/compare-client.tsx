"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, GitCompareArrows, TrendingDown, TrendingUp } from "lucide-react";
import { ScoreRing } from "@/components/score-ring";
import { workspaceFetch } from "@/lib/workspace";
import {
  CATEGORY_KEYS,
  CATEGORY_META,
  scoreColor,
  type FullReport,
  type ReportRow,
} from "@/lib/types";

async function loadReport(id: string): Promise<FullReport | null> {
  if (!id) return null;
  const response = await workspaceFetch(`/api/reports/${id}`);
  const data = (await response.json()) as { report?: FullReport };
  return data.report ?? null;
}

export function CompareClient() {
  const [options, setOptions] = useState<ReportRow[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [baseline, setBaseline] = useState<FullReport | null>(null);
  const [current, setCurrent] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    workspaceFetch("/api/reports?limit=100")
      .then((response) => response.json())
      .then((data: { items?: ReportRow[] }) => {
        if (!active) return;
        const items = data.items ?? [];
        setOptions(items);
        const params = new URLSearchParams(window.location.search);
        setA(params.get("a") || items[1]?.id || "");
        setB(params.get("b") || items[0]?.id || "");
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadReport(a), loadReport(b)])
      .then(([first, second]) => {
        if (!active) return;
        setBaseline(first);
        setCurrent(second);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [a, b]);

  const changedChecks = useMemo(() => {
    if (!baseline || !current) return [];
    const before = new Map(baseline.payload.checks.map((check) => [`${check.category}:${check.id}`, check]));
    const rank = { pass: 3, warn: 2, fail: 1, info: 0 } as const;
    return current.payload.checks
      .map((check) => ({ check, previous: before.get(`${check.category}:${check.id}`) }))
      .filter(({ check, previous }) => previous && previous.status !== check.status && check.status !== "info")
      .map(({ check, previous }) => ({
        label: check.label,
        category: check.category,
        from: previous!.status,
        to: check.status,
        direction: rank[check.status] > rank[previous!.status] ? "improved" : "regressed",
      }))
      .sort((x, y) => (x.direction === "regressed" ? -1 : 1) - (y.direction === "regressed" ? -1 : 1));
  }, [baseline, current]);

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <span className="eyebrow">Progress tracking</span>
        <h1 style={{ marginTop: 12 }}>Compare two scans</h1>
        <p>See which category scores moved and exactly which measured checks changed status. Choose a baseline and a current report.</p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div className="grid-2" style={{ gap: 14 }}>
          <label style={{ display: "grid", gap: 7 }}>
            <span className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Baseline report</span>
            <select className="select-input" value={a} onChange={(event) => setA(event.target.value)}>
              <option value="">Select a report</option>
              {options.map((item) => <option key={item.id} value={item.id}>{item.host} · {new Date(item.createdAt).toLocaleDateString()} · {item.overallScore}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 7 }}>
            <span className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Current report</span>
            <select className="select-input" value={b} onChange={(event) => setB(event.target.value)}>
              <option value="">Select a report</option>
              {options.map((item) => <option key={item.id} value={item.id}>{item.host} · {new Date(item.createdAt).toLocaleDateString()} · {item.overallScore}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn-outline btn-sm" onClick={() => { setA(b); setB(a); }}><ArrowLeftRight size={14} /> Swap order</button>
          <Link href="/reports" className="btn-ghost btn-sm">Manage reports <ArrowRight size={14} /></Link>
        </div>
      </div>

      {loading ? (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>Loading reports…</div>
      ) : !baseline || !current ? (
        <div className="empty-state">
          <GitCompareArrows size={30} className="muted" />
          <h3>Select two reports</h3>
          <p>Comparison needs two saved scans. Run a second analysis of the same site to see progress over time.</p>
          <Link href="/#analyze" className="btn-primary btn-sm">Run an analysis <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <div className="report-stack">
          {baseline.host !== current.host && (
            <div className="form-error">These reports target different hosts ({baseline.host} vs {current.host}). Category deltas are still shown, but cross-domain comparisons are not meaningful.</div>
          )}
          <div className="grid-2">
            {[
              { label: "Baseline", report: baseline },
              { label: "Current", report: current },
            ].map(({ label, report }) => (
              <div className="panel" key={label} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <ScoreRing score={report.overallScore} size={92} />
                <div>
                  <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
                  <h2 style={{ fontSize: 19, marginTop: 8, letterSpacing: "-.03em" }}>{report.host}</h2>
                  <p className="panel-sub">{new Date(report.createdAt).toLocaleString()}</p>
                  <span className={`pill ${report.source === "fixture" ? "info" : "good"}`} style={{ marginTop: 10 }}>{report.source === "fixture" ? "Sample fixture" : "Live scan"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><h2>Score movement</h2><p className="panel-sub">Current minus baseline. Positive values indicate improvement.</p></div>
              <span className={`pill ${current.overallScore >= baseline.overallScore ? "good" : "bad"}`}>
                Overall {current.overallScore - baseline.overallScore >= 0 ? "+" : ""}{current.overallScore - baseline.overallScore}
              </span>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {CATEGORY_KEYS.map((key) => {
                const before = baseline.scores[key];
                const after = current.scores[key];
                const delta = after - before;
                return (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "150px 1fr 74px", gap: 14, alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{CATEGORY_META[key].short}</div>
                    <div>
                      <div className="bar-track"><i style={{ width: `${before}%`, background: "#b9c7bd" }} /></div>
                      <div className="bar-track" style={{ marginTop: 5 }}><i style={{ width: `${after}%`, background: scoreColor(after) }} /></div>
                    </div>
                    <div className="mono" style={{ fontSize: 12, textAlign: "right", color: delta > 0 ? "#126b54" : delta < 0 ? "#b3483f" : "var(--muted)" }}>
                      {delta > 0 ? "+" : ""}{delta} <span className="muted">({before}→{after})</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>Top bar of each pair: baseline. Bottom bar: current scan.</p>
          </div>

          <div className="panel">
            <div className="panel-head"><div><h2>Checks that changed status</h2><p className="panel-sub">{changedChecks.length} measured signals changed between these scans.</p></div></div>
            {changedChecks.length ? (
              <div className="check-list">
                {changedChecks.slice(0, 14).map((item) => (
                  <div className="check-row" key={`${item.category}-${item.label}`}>
                    <span className={`check-status ${item.direction === "improved" ? "pass" : "fail"}`}>
                      {item.direction === "improved" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    </span>
                    <div className="check-body">
                      <strong>{item.label}</strong>
                      <p>{CATEGORY_META[item.category].short} · status changed from {item.from} to {item.to}</p>
                    </div>
                    <span className={`pill ${item.direction === "improved" ? "good" : "bad"}`}>{item.direction}</span>
                  </div>
                ))}
              </div>
            ) : <p className="panel-sub">No check statuses changed between these two scans.</p>}
          </div>

          <div className="panel">
            <div className="panel-head"><div><h2>Next priorities in the current scan</h2><p className="panel-sub">High-priority recommendations from the current report.</p></div><Link href={`/report/${current.id}`} className="btn-outline btn-sm">Open report</Link></div>
            <div style={{ display: "grid", gap: 10 }}>
              {current.payload.recommendations.filter((item) => item.priority === "high").slice(0, 5).map((item) => (
                <div key={`${item.category}-${item.id}`} className="pill neutral" style={{ justifyContent: "flex-start", borderRadius: 10, padding: "11px 13px", fontWeight: 500, lineHeight: 1.5 }}>
                  {item.fix}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
