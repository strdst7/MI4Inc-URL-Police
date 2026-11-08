import { AnalysisError, runFixtureAudit, runLiveAudit } from "@/lib/crawler";
import { FIXTURE_URL } from "@/lib/fixture";
import { enhanceSummary } from "@/lib/narrative";
import { findFreshReport, saveReport } from "@/lib/reports";
import { normalizeUrl, UrlValidationError } from "@/lib/url";
import { parseWorkspaceKey } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (buckets.size > 500) {
    for (const [id, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(id);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function errorResponse(message: string, status = 422) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const workspaceKey = parseWorkspaceKey(request);
  const clientId =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || workspaceKey;
  if (isRateLimited(`${clientId}:${workspaceKey}`))
    return errorResponse(
      "Too many analyses in a short period. Please wait a minute before trying again.",
      429,
    );

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await request.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid request payload.", 400);
  }

  const mode = body.mode === "fixture" ? "fixture" : "live";
  const force = body.force === true;
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

  try {
    let normalizedUrl: string;
    if (mode === "fixture") {
      normalizedUrl = FIXTURE_URL.replace(/\/$/, "");
    } else {
      if (!rawUrl) throw new UrlValidationError("Enter a website URL to analyze.");
      normalizedUrl = normalizeUrl(rawUrl);
    }

    if (!force) {
      const cached = await findFreshReport(workspaceKey, normalizedUrl);
      if (cached)
        return Response.json({
          id: cached.id,
          cached: true,
          overallScore: cached.overallScore,
          url: cached.url,
        });
    }

    const payload = mode === "fixture" ? runFixtureAudit() : await runLiveAudit(rawUrl);
    const enriched = await enhanceSummary(payload);
    payload.summary = enriched.summary;
    payload.summarySource = enriched.source;
    const saved = await saveReport(workspaceKey, payload);
    return Response.json({
      id: saved.id,
      cached: false,
      overallScore: saved.overallScore,
      url: saved.url,
      durationMs: saved.durationMs,
    });
  } catch (error) {
    const message =
      error instanceof UrlValidationError || error instanceof AnalysisError
        ? error.message
        : "The analysis could not be completed. Please try again or use the sample report.";
    return errorResponse(message, error instanceof UrlValidationError ? 400 : 422);
  }
}
