import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SampleButton } from "@/components/scan";
import { CATEGORY_KEYS, CATEGORY_META } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Methodology & privacy · Aimirah Signal",
  description: "How Aimirah Signal scores websites, what it cannot measure, and how data is handled.",
};

export default function MethodologyPage() {
  const integrations = [
    {
      name: "Google PageSpeed Insights / Lighthouse",
      configured: Boolean(process.env.PAGESPEED_API_KEY),
      purpose: "Optional official lab metrics shown separately from heuristic scores.",
      variable: "PAGESPEED_API_KEY",
    },
    {
      name: "OpenAI-compatible AI narrative",
      configured: Boolean(process.env.AI_API_KEY),
      purpose: "Optional expert narrative. Never used to invent scores or evidence.",
      variable: "AI_API_KEY",
    },
    {
      name: "PostgreSQL via Drizzle ORM",
      configured: Boolean(process.env.DATABASE_URL),
      purpose: "Required. Stores report evidence and workspace history.",
      variable: "DATABASE_URL",
    },
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <div className="shell page-head">
          <span className="eyebrow">Transparency first</span>
          <h1 style={{ marginTop: 14 }}>Methodology, scoring & data handling</h1>
          <p>
            Aimirah Signal is an evidence-first website audit engine. This page explains exactly how
            scores are produced, what is deliberately excluded, and which integrations are active in
            this deployment.
          </p>
        </div>

        <div className="shell" style={{ display: "grid", gap: 18, paddingBottom: 80 }}>
          <section className="panel card">
            <h2>1. What happens during a scan</h2>
            <p className="panel-sub" style={{ maxWidth: 760 }}>
              A single bounded HTTP request is made from the server. DNS is resolved and checked
              against private, loopback and link-local ranges before the request — and again after
              every redirect. The HTML body is capped at 1.5 MB, the response is parsed, and a set of
              deterministic checks produce statuses and evidence. External CSS, JavaScript and images
              are counted but never executed.
            </p>
            <div className="metric-grid" style={{ marginTop: 20 }}>
              {["URL normalization", "DNS safety check", "Bounded HTTP fetch", "Header inspection", "HTML parsing", "Weighted scoring", "Persisted evidence"].map((step, index) => (
                <div className="metric-tile" key={step}>
                  <div className="metric-label">Step {index + 1}</div>
                  <div className="metric-value" style={{ fontSize: 13 }}>{step}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card">
            <h2>2. Score arithmetic</h2>
            <p className="panel-sub">
              Each scored check has a status and a weight. A pass contributes 100 points, a warning 60,
              and a failure 15, multiplied by that check&apos;s weight. Category scores are the weighted
              average. The overall score combines all six categories using the weights below. Manual-review
              items are labeled <span className="pill info">info</span> and never affect a score.
            </p>
            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table className="data-table">
                <thead><tr><th>Category</th><th>Overall weight</th><th>What it covers</th></tr></thead>
                <tbody>
                  {CATEGORY_KEYS.map((key) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 650 }}>{CATEGORY_META[key].label}</td>
                      <td className="mono">{Math.round(CATEGORY_META[key].weight * 100)}%</td>
                      <td className="muted" style={{ fontSize: 12 }}>{CATEGORY_META[key].description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid-2">
            <section className="panel card">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}><CheckCircle2 size={19} color="#126b54" /><h2>What is measured</h2></div>
              <ul className="limitation-list" style={{ marginTop: 14 }}>
                <li>HTTP status, timing, redirects, compression, cache and security headers.</li>
                <li>Title, description, canonical, robots directives, language and social metadata.</li>
                <li>Headings, landmarks, alt attributes, labels, accessible names and link text.</li>
                <li>Visible word count, text-to-markup ratio and estimated reading ease.</li>
                <li>Viewport behavior, zoom restrictions and layout-shift risk markers in markup.</li>
                <li>robots.txt and sitemap.xml reachability probes.</li>
              </ul>
            </section>
            <section className="panel card">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}><ShieldCheck size={19} color="#b57a19" /><h2>What is not fabricated</h2></div>
              <ul className="limitation-list" style={{ marginTop: 14 }}>
                <li>Rendered color contrast, computed touch target sizes and visual design quality require a browser and human review. They appear as manual checks, not scores.</li>
                <li>Real-user Core Web Vitals and JavaScript-rendered DOM are outside a single server-side fetch.</li>
                <li>Official Lighthouse scores are only shown when a PageSpeed Insights key is configured.</li>
                <li>AI, when enabled, writes only a narrative. It cannot change checks, scores or evidence.</li>
                <li>This is not a penetration test, compliance certification or full-site crawl.</li>
              </ul>
            </section>
          </div>

          <section className="panel card">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><LockKeyhole size={19} color="#0f725c" /><h2>Security controls</h2></div>
            <div className="grid-3" style={{ marginTop: 18 }}>
              {[
                { title: "SSRF protection", copy: "Only http/https on ports 80/443; DNS results are checked for private, loopback, link-local and reserved ranges before every hop." },
                { title: "Bounded requests", copy: "12-second page timeout, 5-second probe timeout, at most 3 redirects, 1.5 MB HTML cap, no credential forwarding." },
                { title: "Abuse controls", copy: "Server-side rate limiting (12 analyses per minute per client) and server-side URL validation on all requests." },
              ].map((item) => (
                <div className="metric-tile" key={item.title}>
                  <div className="metric-label" style={{ color: "var(--accent)" }}>{item.title}</div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--muted)", marginTop: 9 }}>{item.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel card" id="privacy">
            <h2>3. Data handling & privacy</h2>
            <p className="panel-sub" style={{ maxWidth: 780 }}>
              No account is required. A random workspace key is stored in your browser and scopes your
              report history. Reports are saved in PostgreSQL with full evidence and a UUID identifier.
              Anyone with the exact report UUID can open that report, so treat the link as a shareable
              capability URL. Deletion is restricted to the originating workspace key. Submitted URLs
              are only fetched by this application; optional third-party integrations are disabled
              unless their environment variables are configured.
            </p>
          </section>

          <section className="panel card">
            <h2>4. Integration status for this deployment</h2>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead><tr><th>Integration</th><th>Status</th><th>Purpose</th><th>Variable</th></tr></thead>
                <tbody>
                  {integrations.map((item) => (
                    <tr key={item.name}>
                      <td style={{ fontWeight: 650 }}>{item.name}</td>
                      <td><span className={`pill ${item.configured ? "good" : "neutral"}`}>{item.configured ? "Configured" : "Not configured"}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{item.purpose}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{item.variable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              Core analysis, history, comparison and exports work without any external API key.
            </p>
          </section>

          <section className="card-ink" style={{ padding: 30, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow on-dark">See it in practice</span>
              <h2 style={{ fontSize: 25, letterSpacing: "-.04em", marginTop: 12 }}>Every number links back to a check.</h2>
              <p style={{ color: "#abc7b7", fontSize: 14, marginTop: 9 }}>Open the offline sample report to inspect the full ledger.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <SampleButton className="btn-lime" label="Open sample report" />
              <Link href="/#analyze" className="btn-dark btn-sm">Run live scan <ExternalLink size={14} /></Link>
              <Link href="/reports" className="btn-dark btn-sm">Reports <ArrowRight size={14} /></Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
