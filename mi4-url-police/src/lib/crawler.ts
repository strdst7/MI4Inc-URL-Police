import { buildReport, ENGINE_VERSION, type AuditInput } from "@/lib/audit-engine";
import { FIXTURE_HEADERS, FIXTURE_HTML, FIXTURE_URL } from "@/lib/fixture";
import {
  assertPublicTarget,
  normalizeUrl,
  sameOriginOrPublicRedirect,
  UrlValidationError,
} from "@/lib/url";
import type { LighthouseSummary, ReportPayload } from "@/lib/types";

const MAX_HTML_BYTES = 1_500_000;
const USER_AGENT =
  "AimirahSignal/2.0 (+https://mi4.inc; website audit bot; single-page fetch)";

export class AnalysisError extends Error {}

interface FetchResult {
  url: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  responseTimeMs: number;
  redirectCount: number;
  warnings: string[];
}

async function timedFetch(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new AnalysisError("The website took too long to respond. Try again in a moment.");
    throw new AnalysisError(
      "We could not connect to that website. Check that it is publicly reachable, or try the sample report.",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readLimitedHtml(response: Response): Promise<{ html: string; truncated: boolean }> {
  if (!response.body) return { html: await response.text(), truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let html = "";
  let bytes = 0;
  let truncated = false;
  while (bytes < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (bytes >= MAX_HTML_BYTES) {
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  html += decoder.decode();
  return { html, truncated };
}

async function fetchPage(rawUrl: string): Promise<FetchResult> {
  const started = Date.now();
  let current = rawUrl;
  let redirectCount = 0;
  const warnings: string[] = [];

  for (let hop = 0; hop < 4; hop += 1) {
    await assertPublicTarget(current);
    const response = await timedFetch(current, 12_000);
    const location = response.headers.get("location");
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      redirectCount += 1;
      current = sameOriginOrPublicRedirect(current, location);
      if (redirectCount >= 3)
        throw new AnalysisError("That website redirected too many times to analyze safely.");
      continue;
    }

    if (response.status >= 400)
      throw new AnalysisError(
        `The website returned HTTP ${response.status}. Some sites block automated requests; try another public page or the sample report.`,
      );

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xml|text\/plain/i.test(contentType))
      throw new AnalysisError(
        "That URL did not return an HTML page. Please enter a web page address.",
      );

    const { html, truncated } = await readLimitedHtml(response);
    if (truncated) warnings.push("HTML was truncated at 1.5 MB; some deeply nested content may be missing.");
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return {
      url: current,
      html,
      headers,
      statusCode: response.status,
      responseTimeMs: Date.now() - started,
      redirectCount,
      warnings,
    };
  }
  throw new AnalysisError("Too many redirects were encountered while loading that page.");
}

async function probe(pathname: string, finalUrl: string): Promise<boolean> {
  try {
    const origin = new URL(finalUrl).origin;
    const target = new URL(pathname, origin).toString();
    await assertPublicTarget(target);
    const response = await timedFetch(target, 5_000);
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number }>;
    audits?: Record<string, { displayValue?: string; score?: number | null; title?: string }>;
  };
}

async function fetchLighthouse(
  url: string,
): Promise<{ data: LighthouseSummary | null; warning?: string }> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return { data: null };
  try {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("key", key);
    endpoint.searchParams.set("strategy", process.env.PAGESPEED_STRATEGY === "desktop" ? "desktop" : "mobile");
    ["performance", "accessibility", "seo", "best-practices"].forEach((category) =>
      endpoint.searchParams.append("category", category),
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    let json: PageSpeedResponse;
    try {
      const response = await fetch(endpoint.toString(), { signal: controller.signal });
      if (!response.ok) throw new Error(`PageSpeed returned ${response.status}`);
      json = (await response.json()) as PageSpeedResponse;
    } finally {
      clearTimeout(timer);
    }
    const result = json.lighthouseResult;
    if (!result?.categories) throw new Error("PageSpeed returned no Lighthouse result");
    const score = (name: string) => Math.round((result.categories?.[name]?.score ?? 0) * 100);
    const metricKeys = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "cumulative-layout-shift",
      "total-blocking-time",
      "speed-index",
    ];
    return {
      data: {
        performance: score("performance"),
        accessibility: score("accessibility"),
        seo: score("seo"),
        bestPractices: score("best-practices"),
        strategy: process.env.PAGESPEED_STRATEGY === "desktop" ? "desktop" : "mobile",
        metrics: metricKeys.map((metric) => {
          const audit = result.audits?.[metric];
          return {
            label: audit?.title ?? metric,
            value: audit?.displayValue ?? "—",
            score: typeof audit?.score === "number" ? Math.round(audit.score * 100) : null,
          };
        }),
      },
    };
  } catch {
    return {
      data: null,
      warning: "Optional PageSpeed Insights request failed; local heuristic scoring was used instead.",
    };
  }
}

export async function runLiveAudit(rawUrl: string): Promise<ReportPayload> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const started = Date.now();
  const page = await fetchPage(normalizedUrl);
  const [robotsReachable, sitemapReachable, lighthouse] = await Promise.all([
    probe("/robots.txt", page.url),
    probe("/sitemap.xml", page.url),
    fetchLighthouse(normalizedUrl),
  ]);
  const warnings = [...page.warnings];
  if (lighthouse.warning) warnings.push(lighthouse.warning);
  if (page.url !== normalizedUrl)
    warnings.push(`This URL redirected to ${page.url}; the final document was audited.`);

  const input: AuditInput = {
    url: rawUrl,
    normalizedUrl,
    finalUrl: page.url,
    html: page.html,
    headers: page.headers,
    statusCode: page.statusCode,
    responseTimeMs: page.responseTimeMs,
    durationMs: Date.now() - started,
    redirectCount: page.redirectCount,
    source: "live",
    robotsReachable,
    sitemapReachable,
    lighthouse: lighthouse.data,
    warnings,
  };
  return buildReport(input);
}

/** Offline sample: the same engine, applied to a bundled HTML document. */
export function runFixtureAudit(): ReportPayload {
  const started = Date.now();
  const input: AuditInput = {
    url: FIXTURE_URL,
    normalizedUrl: FIXTURE_URL.replace(/\/$/, ""),
    finalUrl: FIXTURE_URL,
    html: FIXTURE_HTML,
    headers: FIXTURE_HEADERS,
    statusCode: 200,
    responseTimeMs: 186,
    durationMs: 0,
    redirectCount: 0,
    source: "fixture",
    robotsReachable: false,
    sitemapReachable: false,
    lighthouse: null,
    warnings: [],
  };
  const payload = buildReport(input);
  payload.durationMs = Math.max(1, Date.now() - started);
  payload.engineVersion = ENGINE_VERSION;
  return payload;
}

export { UrlValidationError };
