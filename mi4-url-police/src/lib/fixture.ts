/**
 * A self-contained sample document. The sample report runs the exact same
 * audit engine against this markup, so its numbers are reproducible offline.
 */
export const FIXTURE_URL = "https://sample.aimirah.systems/";

export const FIXTURE_HEADERS: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cache-control": "public, max-age=3600",
  "content-encoding": "br",
};

export const FIXTURE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Northstar Analytics — Clarity for growing product teams</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Northstar Analytics helps product teams understand activation, retention, and revenue with one calm, reliable workspace." />
  <meta property="og:title" content="Northstar Analytics" />
  <meta property="og:description" content="Clarity for growing product teams." />
  <meta property="og:image" content="https://sample.aimirah.systems/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://sample.aimirah.systems/" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.example.com" />
  <link rel="stylesheet" href="/styles.css" />
  <script src="/analytics.js"></script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Northstar Analytics"}</script>
</head>
<body>
  <header><nav aria-label="Primary"><a href="/product">Product</a><a href="/pricing">Pricing</a><a href="/about">About</a><a href="/contact">Contact</a></nav></header>
  <main>
    <section>
      <h1>Make better product decisions with calm, trustworthy data</h1>
      <p>Northstar Analytics brings activation, retention, and revenue into one focused workspace. Connect your warehouse in minutes, define the moments that matter, and share a clear picture with your team. Every metric is documented so nobody has to guess what a number means.</p>
      <p>Teams use Northstar to spot churn risks early, understand which features drive long-term value, and align weekly decisions around a shared source of truth. Build dashboards without writing SQL, schedule reports for stakeholders, and keep a full audit trail of every definition change.</p>
      <a href="/demo">Get started</a>
      <a href="/pricing">Learn more</a>
      <img src="/hero.png" alt="Northstar dashboards showing retention trends" width="1200" height="700" />
      <img src="/decorative.png" />
      <h2>One workspace, every answer</h2>
      <p>Explore cohorts, funnels, and revenue movements with a consistent data model. Our query layer is optimized so large datasets stay responsive, and permissions keep sensitive information in the right hands.</p>
      <h2>Built for teams that move quickly</h2>
      <p>Invite your team, connect Slack, and publish a weekly digest. Every chart links back to its definition, so discussions start with shared context instead of spreadsheet archaeology.</p>
      <form action="/newsletter"><input type="email" name="email" /><button type="submit">Subscribe</button></form>
      <div style="width: 920px; padding: 24px">A fixed-width promotional panel.</div>
    </section>
  </main>
  <footer>
    <a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a>
    <a href="mailto:hello@example.com">hello@example.com</a>
    <p>&copy; 2026 Northstar Analytics. All rights reserved.</p>
  </footer>
  <script src="https://cdn.example-tracker.net/tag.js"></script>
</body>
</html>`;
