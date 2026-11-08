import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Code2,
  FileSearch,
  Gauge,
  Globe2,
  Layers3,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyzeForm, SampleButton } from "@/components/scan";
import { RecentReports } from "@/components/recent-reports";
import { runFixtureAudit } from "@/lib/crawler";
import { CATEGORY_META, scoreColor } from "@/lib/types";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Gauge,
    title: "Delivery performance",
    copy: "Response time, payload size, compression, cache policy, render-blocking scripts and third-party footprint.",
  },
  {
    icon: FileSearch,
    title: "Search discoverability",
    copy: "Title, description, canonical, headings, indexability, language, social previews, structured data and sitemap probes.",
  },
  {
    icon: ScanSearch,
    title: "Accessible markup",
    copy: "Alternative text, labeled form controls, named actions, landmarks, skip links and descriptive anchor text.",
  },
  {
    icon: ShieldCheck,
    title: "Security & trust",
    copy: "HTTPS, HSTS, CSP, frame and MIME protections, referrer policy, mixed content and visible policy links.",
  },
  {
    icon: Layers3,
    title: "Content clarity",
    copy: "Visible word count, text-to-markup ratio, estimated reading ease, headline specificity and CTA language.",
  },
  {
    icon: Globe2,
    title: "Mobile readiness",
    copy: "Viewport configuration, zoom restrictions, fixed-width risk, image dimensions and responsive stylesheet signals.",
  },
];

export default function HomePage() {
  const sample = runFixtureAudit();
  const scoredSignals = sample.checks.filter((check) => check.status !== "info").length;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="shell hero-inner">
            <div>
              <span className="eyebrow on-dark">MI4, Inc · aimirah-systems</span>
              <h1>
                Website audits with <em>evidence,</em> not theater.
              </h1>
              <p className="hero-copy">
                Aimirah Signal fetches a public page, inspects its HTTP response, parses the HTML and
                scores only signals it can actually measure. Every finding comes with context, a
                suggested fix and an honest confidence boundary.
              </p>
              <div id="analyze" style={{ marginTop: 32, scrollMarginTop: 90 }}>
                <AnalyzeForm />
              </div>
              <div className="hero-note">
                <span><BadgeCheck size={14} /> No account required</span>
                <span><LockKeyhole size={14} /> SSRF-protected fetch</span>
                <span><BarChart3 size={14} /> Deterministic scoring</span>
                <SampleButton className="btn-dark btn-sm" label="Explore sample report" />
              </div>
            </div>

            <div aria-label="Preview of a sample report">
              <div className="preview-frame">
                <div className="preview-bar">
                  <span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" />
                  <span className="preview-url">aimirah.systems / report / sample</span>
                </div>
                <div className="preview-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div className="muted" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".12em" }}>Overall signal score</div>
                      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.05em", color: scoreColor(sample.scores.overall) }}>
                        {sample.scores.overall}<span className="muted" style={{ fontSize: 12, fontWeight: 500 }}> / 100</span>
                      </div>
                    </div>
                    <span className="pill info" style={{ fontSize: 9 }}>Sample fixture</span>
                  </div>
                  <div className="preview-scores">
                    {(["performance", "seo", "accessibility"] as const).map((key) => (
                      <div className="preview-score" key={key}>
                        <span>{CATEGORY_META[key].short}</span>
                        <strong style={{ color: scoreColor(sample.scores[key]) }}>{sample.scores[key]}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    {(["security", "content", "mobile"] as const).map((key) => (
                      <div className="preview-bar-row" key={key}>
                        <span style={{ width: 76 }}>{CATEGORY_META[key].short}</span>
                        <span className="preview-track"><i style={{ width: `${sample.scores[key]}%`, background: scoreColor(sample.scores[key]) }} /></span>
                        <strong className="mono" style={{ width: 22, textAlign: "right" }}>{sample.scores[key]}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 10.5 }} className="muted">
                    {scoredSignals} measured signals · {sample.recommendations.length} prioritized fixes · no invented design scores
                  </div>
                </div>
              </div>
              <p style={{ textAlign: "center", color: "#8fae9e", fontSize: 11.5, marginTop: 14 }}>
                Preview values are computed live from a bundled HTML sample, not a static mockup.
              </p>
            </div>
          </div>
        </section>

        <section className="section tight" style={{ borderBottom: "1px solid var(--line)", background: "#fff" }}>
          <div className="shell" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center" }}>
            {[
              { value: String(scoredSignals), label: "measured signals per scan" },
              { value: "6", label: "transparent score categories" },
              { value: String(sample.recommendations.length), label: "prioritized fixes in the sample" },
              { value: "0", label: "fabricated Lighthouse or design scores" },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.05em" }}>{stat.value}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, maxWidth: "none", flexWrap: "wrap" }}>
              <div>
                <span className="eyebrow">Your workspace</span>
                <h2 className="section-title" style={{ marginTop: 14 }}>Recent analyses</h2>
                <p className="section-copy" style={{ marginTop: 10 }}>
                  Saved to your private browser workspace. Open a report, compare two scans, or export the evidence.
                </p>
              </div>
              <Link href="/reports" className="btn-outline btn-sm">View all reports <ArrowRight size={14} /></Link>
            </div>
            <RecentReports limit={3} />
          </div>
        </section>

        <section className="section" style={{ background: "#fff", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="shell">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2 className="section-title" style={{ marginTop: 14 }}>From URL to defensible action plan</h2>
            </div>
            <div className="grid-3">
              {[
                {
                  step: "01",
                  icon: Globe2,
                  title: "Submit a public URL",
                  copy: "We normalize the address, resolve DNS, reject private network targets and follow redirects under the same safety checks.",
                },
                {
                  step: "02",
                  icon: Code2,
                  title: "Inspect the real response",
                  copy: "One bounded HTTP fetch captures headers, timing, status and HTML. The parser evaluates measurable signals across six categories.",
                },
                {
                  step: "03",
                  icon: CheckCircle2,
                  title: "Act on transparent findings",
                  copy: "Each check shows evidence and status. Recommendations are prioritized by impact and effort, with quick wins called out separately.",
                },
              ].map((item) => (
                <div className="card feature-card" key={item.step}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span className="feature-icon"><item.icon size={20} /></span>
                    <span className="step-number">{item.step}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <div className="section-head">
              <span className="eyebrow">Measured, not imagined</span>
              <h2 className="section-title" style={{ marginTop: 14 }}>Six categories. Every score traceable to a check.</h2>
              <p className="section-copy" style={{ marginTop: 12 }}>
                Open any category in a report to see the exact status, evidence and weight behind the number.
              </p>
            </div>
            <div className="grid-3">
              {features.map((item) => (
                <div className="card feature-card" key={item.title}>
                  <span className="feature-icon"><item.icon size={20} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              ))}
            </div>
            <div className="card-ink" style={{ marginTop: 20, padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <span className="eyebrow on-dark">Integrity by design</span>
                <h3 style={{ fontSize: 24, letterSpacing: "-.04em", marginTop: 14 }}>We label what cannot be measured.</h3>
                <p style={{ color: "#abc7b7", fontSize: 14, lineHeight: 1.7, marginTop: 10 }}>
                  Rendered color contrast, touch target sizes and aesthetic quality require a real browser and human review. We surface them as manual checks instead of inventing numbers. Optional Lighthouse and AI integrations are clearly marked when configured.
                </p>
                <Link href="/methodology" className="btn-dark btn-sm" style={{ marginTop: 18 }}>
                  Read the methodology <ArrowRight size={14} />
                </Link>
              </div>
              <div style={{ display: "grid", gap: 10, alignContent: "center" }}>
                {[
                  "No hardcoded fallback report data",
                  "No opaque 'AI score' without evidence",
                  "No public write access to the report database",
                  "No credentials required for core analysis",
                ].map((line) => (
                  <div key={line} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", border: "1px solid rgba(255,255,255,.13)", borderRadius: 11, fontSize: 13, color: "#dcebe1" }}>
                    <CheckCircle2 size={16} color="#c9eb67" /> {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section tight">
          <div className="shell card" style={{ padding: 38, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 340px" }}>
              <span className="eyebrow">Start with evidence</span>
              <h2 className="section-title" style={{ marginTop: 14, fontSize: 32 }}>Run a live audit in one step.</h2>
              <p className="section-copy" style={{ marginTop: 10, fontSize: 14 }}>
                Or open the offline sample to see the full report before scanning anything.
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SampleButton className="btn-outline btn-sm" label="Sample report" />
                <Link href="/compare" className="btn-ghost btn-sm">Compare reports <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div style={{ flex: "1 1 380px" }}>
              <AnalyzeForm variant="light" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
