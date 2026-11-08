"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileSearch, Search, Trash2 } from "lucide-react";
import { SampleButton } from "@/components/scan";
import { ScoreRing } from "@/components/score-ring";
import { workspaceFetch } from "@/lib/workspace";
import type { ReportRow } from "@/lib/types";

export function HistoryClient() {
  const router = useRouter();
  const [items, setItems] = useState<ReportRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    workspaceFetch("/api/reports?limit=100")
      .then((response) => response.json())
      .then((data: { items?: ReportRow[]; error?: string }) => {
        if (data.items) setItems(data.items);
        else setError(data.error ?? "Could not load reports.");
      })
      .catch(() => setError("Could not load reports."));
  }, []);

  useEffect(() => load(), [load]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= 2
          ? [current[1], id]
          : [...current, id],
    );
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this report from your workspace? Shared links will stop working.")) return;
    const response = await workspaceFetch(`/api/reports/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => (current ?? []).filter((item) => item.id !== id));
      setSelected((current) => current.filter((value) => value !== id));
      setNotice("Report deleted.");
      setTimeout(() => setNotice(null), 2400);
    } else {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete report.");
    }
  }

  const filtered = (items ?? []).filter((item) =>
    `${item.host} ${item.normalizedUrl}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Workspace library</span>
          <h1 style={{ marginTop: 12 }}>Report history</h1>
          <p>Every scan is stored with its evidence. Select two reports to measure progress over time.</p>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <SampleButton className="btn-outline btn-sm" label="Open sample" />
          <Link href="/#analyze" className="btn-primary btn-sm">New analysis <ArrowRight size={14} /></Link>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="input-shell" style={{ flex: "1 1 260px", boxShadow: "none", background: "#fafbf7", borderColor: "var(--line)", padding: "4px 12px" }}>
          <Search size={16} />
          <input className="field-input" style={{ padding: "9px 0", fontSize: 13 }} placeholder="Search by domain or URL" aria-label="Search reports" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <span className="pill neutral">{filtered.length} report{filtered.length === 1 ? "" : "s"}</span>
        <button
          className="btn-primary btn-sm"
          disabled={selected.length !== 2}
          onClick={() => router.push(`/compare?a=${selected[0]}&b=${selected[1]}`)}
        >
          Compare selected ({selected.length}/2) <ArrowRight size={14} />
        </button>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
      {!items ? (
        <div className="card card-pad muted" style={{ fontSize: 13 }}>Loading your reports…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FileSearch size={30} className="muted" />
          <h3>{items.length ? "No matching reports" : "Your workspace is empty"}</h3>
          <p>{items.length ? "Try a different domain or URL search." : "Run a live analysis or open the offline sample. Reports are scoped to this browser workspace."}</p>
          <SampleButton className="btn-primary btn-sm" label="Open sample report" />
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Pick</th>
                <th>Domain</th>
                <th>Scanned</th>
                <th>Overall</th>
                <th>Perf / SEO / A11y / Sec</th>
                <th>Source</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select report for ${item.host}`}
                      checked={selected.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 650 }}>{item.host}</div>
                    <div className="muted mono" style={{ fontSize: 10.5, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.normalizedUrl}</div>
                  </td>
                  <td className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><ScoreRing score={item.overallScore} size={42} stroke={5} label="" /><strong className="mono">{item.overallScore}</strong></div></td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {(["performance", "seo", "accessibility", "security"] as const).map((key) => item.scores[key]).join(" / ")}
                  </td>
                  <td><span className={`pill ${item.source === "fixture" ? "info" : "good"}`}>{item.source === "fixture" ? "Sample" : "Live"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Link className="btn-outline btn-sm" href={`/report/${item.id}`}>Open</Link>
                      <button className="btn-ghost btn-sm btn-icon" onClick={() => void remove(item.id)} aria-label={`Delete report for ${item.host}`} title="Delete report"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 16 }}>
        Reports are private to this browser workspace by default. Anyone with the exact report UUID can open it, which makes a link a simple, shareable capability URL. Deletion only works from the originating workspace.
      </p>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
