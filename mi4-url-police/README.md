# Aimirah Signal — MI4, Inc | aimirah-systems

An evidence-first website review platform. Submit a public URL and receive a measured audit across six categories, with transparent checks, reproducible evidence, prioritized remediation, saved history, comparison, and exports.

This is an original implementation inspired by the **verified core purpose** of the reference site (`url-kilatis.vercel.app`): URL submission → analysis → a multi-category report dashboard with performance, SEO, accessibility, security/trust, content and mobile sections, recommendations, and recent scans. It is not a copy of that site's branding, assets, code, or data.

## What is implemented

| Capability | Detail |
| --- | --- |
| Live server-side analysis | Normalizes the URL, resolves DNS, validates public targets, follows up to 3 redirects with revalidation, bounds time/response size, parses HTML with Cheerio, inspects HTTP headers. |
| Transparent scoring | 6 weighted categories built from ~50 deterministic checks. Every check has a status, detail, evidence and weight. Manual-only items are labeled `info` and excluded from scores. |
| Executive summary | Deterministic summary derived from measured scores and findings. Optional AI narrative can be appended, never used to invent evidence. |
| Action plan | Prioritized recommendations with why / fix / impact / effort, plus a low-effort quick-win plan. |
| Report persistence | PostgreSQL via Drizzle ORM. UUID report links, anonymous browser workspace scoping, freshness cache (6h), re-scan with `force`. |
| History & comparison | Search, delete, select two reports, compare score deltas and changed check statuses. |
| Exports | Full JSON, checks CSV, browser print / Save as PDF, copy share link. |
| Sample mode | A bundled HTML fixture analyzed by the **same engine**; works offline and is clearly labeled as a sample. |
| Report dashboard | Overview, category views, action plan, evidence/provenance, optional Lighthouse data, warnings and measurement limits. |
| Security controls | SSRF protections (protocol, port, DNS resolution, private/reserved ranges, redirect revalidation), request/response limits, rate limiting, server-side validation, no public DB writes from the browser, no secrets in client bundles. |
| UX | Responsive desktop/tablet/mobile layouts, keyboard-visible focus states, semantic landmarks, reduced-motion support, print stylesheet, loading/error/empty states, accessible form labels and status announcements. |

## Technology stack

- **Next.js 16 App Router** (React 19, TypeScript, server components + route handlers)
- **Tailwind CSS 4** plus a custom MI4 design-token layer in `src/app/globals.css`
- **PostgreSQL** with **Drizzle ORM** (`src/db/schema.ts`)
- **Cheerio** for HTML parsing, **lucide-react** for icons
- Node.js runtime for all audit API routes (`node:dns`, `fetch`, `AbortController`)

## Architecture

```
src/
  app/
    page.tsx                    Landing + live analysis form + recent scans
    report/[id]/page.tsx        Server-rendered report lookup by UUID
    reports/page.tsx            Workspace report library
    compare/page.tsx            Side-by-side scan comparison
    methodology/page.tsx        Scoring, security, privacy, integration status
    api/analyze/route.ts        POST: validate → cache → audit → enrich → persist
    api/reports/route.ts        GET: workspace-scoped list
    api/reports/[id]/route.ts   GET by UUID / DELETE scoped to workspace
    api/health/route.ts         Healthcheck
  components/                   Brand, navigation, forms, scan overlay, report workspace,
                                history, comparison, score ring
  lib/
    audit-engine.ts             Deterministic checks, scores, recommendations, metrics
    crawler.ts                  Hardened fetch, probes, optional PageSpeed adapter, fixture
    url.ts                      URL normalization + SSRF protections
    reports.ts                  Drizzle persistence helpers
    narrative.ts                Optional OpenAI-compatible AI narrative
    fixture.ts                  Offline sample HTML document
    types.ts                    Shared domain types and score helpers
    workspace.ts                Anonymous workspace key + API header helpers
    export.ts                   Client-side JSON/CSV/clipboard helpers
  db/schema.ts                  reports table
```

## Database structure

`reports` table:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` PK, `defaultRandom()` | Shareable capability URL |
| `workspace_key` | `text` | Anonymous browser workspace |
| `url`, `normalized_url`, `host` | `text` | Original + canonical address |
| `overall_score` | `integer` | Cached overall score |
| `scores` | `jsonb` | Six category scores |
| `payload` | `jsonb` | Full report: checks, evidence, recommendations, metrics, provenance |
| `source` | `text` | `live` / `fixture` |
| `duration_ms` | `integer` | Audit duration |
| `created_at` | `timestamptz` | Scan timestamp |

Indexes: `(workspace_key, created_at)` and `(normalized_url, created_at)`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Provided in `.env` for the local sandbox. |
| `PAGESPEED_API_KEY` | No | Google PageSpeed Insights v5 key. When set, official Lighthouse lab metrics appear **separately** from heuristic scores. |
| `PAGESPEED_STRATEGY` | No | `mobile` (default) or `desktop`. |
| `AI_API_KEY` | No | OpenAI-compatible API key for an optional narrative paragraph only. |
| `AI_API_BASE_URL` | No | Defaults to `https://api.openai.com/v1`. Compatible providers can be used. |
| `AI_MODEL` | No | Defaults to `gpt-4o-mini`. |

No external credentials are required for core functionality. Secrets are read only in server-side route handlers; nothing sensitive is exposed through `NEXT_PUBLIC_*`.

## Local setup

```bash
npm install
# .env: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx drizzle-kit push        # create the reports table
npm run dev                 # http://localhost:3000
```

Production validation:

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
npm run start
```

Healthcheck: `GET /api/health` → `{ "ok": true }`.

## Using the app

1. Open `/`, enter a public URL (e.g. `example.com`) and choose **Analyze**.
2. Or choose **Explore sample report** for an offline, reproducible fixture audit.
3. The report opens at `/report/{uuid}`. Use the sidebar to inspect categories, open the action plan, and review the evidence ledger.
4. Use **Export** for JSON, CSV, print/Save as PDF, or a shareable link.
5. Open `/reports` to search, delete, or select two reports; `/compare` shows deltas.
6. **Re-scan** creates a fresh live report (bypasses the 6-hour cache).

## Verified reference limitations addressed

- The reference app's live backend currently returns an error (`llama-3.3-70b-versatile` model unavailable), and its UI can silently fall back to hardcoded sample scores. This implementation never substitutes invented values for a failed analysis; it shows a clear error and offers an explicitly labeled offline sample.
- The reference's **Export PDF** button has no click handler. All export actions here are functional.
- The reference stores scans in a publicly configured Firebase client and exposes an API key in the shipped bundle. Here, all writes go through validated server routes into PostgreSQL.
- The reference labels static heuristics as AI design/UX judgments. Here, unmeasurable visual/touch-target/contrast items are explicitly marked as manual checks.

## Known limitations

- One server-side HTML fetch: no JavaScript rendering, full-site crawl, computed CSS contrast, real-user Core Web Vitals, or visual design judgment.
- Anonymous workspace keys are browser-local; clearing site data loses history access (shareable UUID links still work).
- Rate limiting is in-memory per server process; use Redis or an edge rate limiter for multi-instance production.
- Print-to-PDF relies on the browser's print dialog rather than a server-side PDF renderer.
- Cached reports are scoped per workspace for 6 hours; `force` bypasses the cache.
- Some sites block automated user agents or return client-only HTML; these produce a clear failure or a lower-confidence report with warnings.

## Recommended future enhancements

Authenticated team workspaces and RBAC, scheduled monitoring with score trend alerts, headless-browser rendering for contrast/touch targets, multi-page crawling, server-generated PDF reports, webhook notifications, and a plugin framework for custom checks.
