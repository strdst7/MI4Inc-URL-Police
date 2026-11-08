"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, FileSearch } from "lucide-react";
import { SampleButton } from "@/components/scan";
import { ScoreRing } from "@/components/score-ring";
import { workspaceFetch } from "@/lib/workspace";
import type { ReportRow } from "@/lib/types";

function timeAgo(value: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function RecentReports({ limit = 3 }: { limit?: number }) {
  const [items, setItems] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    workspaceFetch(`/api/reports?limit=${limit}`)
      .then((response) => response.json())
      .then((data: { items?: ReportRow[]; error?: string }) => {
        if (!active) return;
        if (data.items) setItems(data.items);
        else setError(data.error ?? "Could not load reports.");
      })
      .catch(() => active && setError("Could not load reports."));
    return () => {
      active = false;
    };
  }, [limit]);

  if (error) return <p className="muted" style={{ fontSize: 13 }}>{error}</p>;
  if (!items)
    return (
      <div className="grid-3">
        {[0, 1, 2].slice(0, limit).map((index) => (
          <div key={index} className="card card-pad" style={{ minHeight: 132, opacity: 0.55 }} />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <div className="empty-state">
        <FileSearch size={28} className="muted" />
        <h3>No scans in this workspace yet</h3>
        <p>
          Run your first live audit or open the bundled sample report. Both use the same scoring
          engine and are saved here.
        </p>
        <SampleButton className="btn-primary btn-sm" label="Open sample report" />
      </div>
    );

  return (
    <div className="grid-3">
      {items.map((item) => (
        <Link key={item.id} href={`/report/${item.id}`} className="card card-pad fade-in" style={{ display: "block" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.host}
              </div>
              <div className="muted mono" style={{ fontSize: 11, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.normalizedUrl}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock3 size={12} /> {timeAgo(item.createdAt)}
                {item.source === "fixture" && <span className="pill info" style={{ padding: "3px 8px" }}>Sample</span>}
              </div>
            </div>
            <ScoreRing score={item.overallScore} size={64} stroke={6} label="" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            {(["performance", "seo", "accessibility", "security"] as const).map((key) => (
              <div key={key} style={{ fontSize: 10.5 }}>
                <div className="muted" style={{ textTransform: "uppercase", letterSpacing: ".07em" }}>{key.slice(0, 4)}</div>
                <strong className="mono" style={{ fontSize: 13 }}>{item.scores[key]}</strong>
              </div>
            ))}
            <ArrowUpRight size={15} className="muted" />
          </div>
        </Link>
      ))}
    </div>
  );
}
