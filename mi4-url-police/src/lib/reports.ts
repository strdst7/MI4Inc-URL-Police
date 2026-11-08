import { db } from "@/db";
import { reports, type ReportSelect } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import type { FullReport, ReportPayload, ReportRow } from "@/lib/types";

export function isValidReportId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function serialize(row: ReportSelect): FullReport {
  return {
    id: row.id,
    url: row.url,
    host: row.host,
    normalizedUrl: row.normalizedUrl,
    overallScore: row.overallScore,
    scores: row.scores,
    source: row.source as FullReport["source"],
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    durationMs: row.durationMs,
    payload: row.payload,
  };
}

function toRow(row: ReportSelect): ReportRow {
  const full = serialize(row);
  return {
    id: full.id,
    url: full.url,
    host: full.host,
    normalizedUrl: full.normalizedUrl,
    overallScore: full.overallScore,
    scores: full.scores,
    source: full.source,
    createdAt: full.createdAt,
    durationMs: full.durationMs,
  };
}

export async function listReports(workspaceKey: string, limit = 40): Promise<ReportRow[]> {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.workspaceKey, workspaceKey))
    .orderBy(desc(reports.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map(toRow);
}

export async function getFullReport(id: string): Promise<FullReport | null> {
  if (!isValidReportId(id)) return null;
  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return rows[0] ? serialize(rows[0]) : null;
}

export async function findFreshReport(
  workspaceKey: string,
  normalizedUrl: string,
  maxAgeHours = 6,
): Promise<FullReport | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.workspaceKey, workspaceKey),
        eq(reports.normalizedUrl, normalizedUrl),
        gte(reports.createdAt, cutoff),
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(1);
  return rows[0] ? serialize(rows[0]) : null;
}

export async function saveReport(
  workspaceKey: string,
  payload: ReportPayload,
): Promise<FullReport> {
  const [row] = await db
    .insert(reports)
    .values({
      workspaceKey,
      url: payload.normalizedUrl,
      normalizedUrl: payload.normalizedUrl,
      host: payload.host,
      overallScore: payload.scores.overall,
      scores: payload.scores,
      payload,
      source: payload.source,
      durationMs: payload.durationMs,
    })
    .returning();
  return serialize(row);
}

export async function deleteOwnedReport(id: string, workspaceKey: string): Promise<boolean> {
  if (!isValidReportId(id)) return false;
  const rows = await db
    .delete(reports)
    .where(and(eq(reports.id, id), eq(reports.workspaceKey, workspaceKey)))
    .returning({ id: reports.id });
  return rows.length > 0;
}
