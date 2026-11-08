import * as cheerio from "cheerio";
import {
  CATEGORY_KEYS,
  CATEGORY_META,
  statusPoints,
  type AuditCheck,
  type AuditMetric,
  type CategoryKey,
  type CheckStatus,
  type LighthouseSummary,
  type PageFacts,
  type Priority,
  type Recommendation,
  type ReportPayload,
  type Scores,
  type SecurityHeaderFacts,
} from "@/lib/types";

export const ENGINE_VERSION = "2.0.0";

export interface AuditInput {
  url: string;
  normalizedUrl: string;
  finalUrl: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  responseTimeMs: number;
  durationMs: number;
  redirectCount: number;
  source: "live" | "fixture";
  robotsReachable: boolean;
  sitemapReachable: boolean;
  lighthouse: LighthouseSummary | null;
  warnings: string[];
}

function header(headers: Record<string, string>, name: string): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? (headers[key] ?? "").trim() : "";
}

function syllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const groups = cleaned.match(/[aeiouy]+/g)?.length ?? 1;
  return Math.max(1, groups - (cleaned.endsWith("e") && groups > 1 ? 1 : 0));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function buildReport(input: AuditInput): ReportPayload {
  const $ = cheerio.load(input.html);
  const checks: AuditCheck[] = [];
  const warnings = [...input.warnings];
  const finalUrl = input.finalUrl;
  const isHttps = finalUrl.startsWith("https://");
  const htmlBytes = Buffer.byteLength(input.html, "utf8");

  const add = (
    category: CategoryKey,
    id: string,
    label: string,
    status: CheckStatus,
    detail: string,
    weight: number,
    extra: Partial<AuditCheck> = {},
  ) => checks.push({ category, id, label, status, detail, weight, ...extra });

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";
  const metaTags = $("meta").toArray();
  const metaContent = (attribute: "name" | "property", value: string): string => {
    const tag = metaTags.find(
      (el) => $(el).attr(attribute)?.toLowerCase() === value.toLowerCase(),
    );
    return tag ? ($(tag).attr("content") ?? "").trim() : "";
  };
  const description = metaContent("name", "description");
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  const viewport = metaContent("name", "viewport");
  const robotsMeta = metaContent("name", "robots");
  const language = $("html").attr("lang")?.trim() ?? "";
  const ogTags = metaTags.filter((el) =>
    ($(el).attr("property") ?? "").toLowerCase().startsWith("og:"),
  ).length;
  const twitterCard = metaContent("name", "twitter:card");
  const jsonLdBlocks = $('script[type="application/ld+json"]').length;
  const h1 = $("h1")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim());
  const headings = $("h1,h2,h3,h4,h5,h6").toArray();

  const images = $("img").toArray();
  const imagesMissingAlt = images.filter((el) => $(el).attr("alt") === undefined).length;
  const imagesMissingDimensions = images.filter(
    (el) => !$(el).attr("width") || !$(el).attr("height"),
  ).length;
  const lazyImages = images.filter((el) => $(el).attr("loading") === "lazy").length;
  const scripts = $("script").toArray();
  const headScripts = $("head script[src]").toArray();
  const blockingScripts = headScripts.filter((el) => {
    const el$ = $(el);
    return (
      !el$.attr("async") &&
      !el$.attr("defer") &&
      el$.attr("type") !== "module"
    );
  }).length;
  const externalScriptHosts = new Set<string>();
  scripts.forEach((el) => {
    const src = $(el).attr("src") ?? "";
    if (/^https?:\/\//i.test(src)) {
      try {
        const host = new URL(src).hostname;
        if (host !== new URL(finalUrl).hostname) externalScriptHosts.add(host);
      } catch {
        /* invalid src */
      }
    }
  });
  const stylesheets = $('link[rel="stylesheet"]').length;
  const resourceHints = $("link[rel=preconnect], link[rel=preload], link[rel=dns-prefetch]").length;
  const links = $("a[href]").toArray();
  const baseHost = new URL(finalUrl).hostname.replace(/^www\./, "");
  const internalLinkCount = links.filter((el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) return true;
    try {
      return new URL(href).hostname.replace(/^www\./, "") === baseHost;
    } catch {
      return false;
    }
  }).length;
  const genericAnchorWords = /^(click here|learn more|read more|here|more|submit|go|link)$/i;
  const genericAnchors = links.filter((el) =>
    genericAnchorWords.test($(el).text().replace(/\s+/g, " ").trim()),
  ).length;
  const unlabeledControls = $("input:not([type=hidden]), select, textarea")
    .toArray()
    .filter((el) => {
      const el$ = $(el);
      const id = el$.attr("id");
      const hasLabel = !!id && $(`label[for="${id}"]`).length > 0;
      return (
        !el$.attr("aria-label") &&
        !el$.attr("aria-labelledby") &&
        !el$.attr("placeholder") &&
        !hasLabel &&
        el$.parents("label").length === 0
      );
    }).length;
  const formControls = $("input:not([type=hidden]), select, textarea").length;
  const namelessActions = $("button, a[href]")
    .toArray()
    .filter((el) => {
      const el$ = $(el);
      return (
        !el$.text().replace(/\s+/g, " ").trim() &&
        !el$.attr("aria-label") &&
        !el$.attr("title") &&
        !el$.find("img[alt]").length
      );
    }).length;
  const landmarks = $("header, main, footer, nav, [role=main], [role=navigation]").length;
  const skipLink = links.some((el) =>
    /skip to (main|content)/i.test($(el).text().trim()),
  );
  const allText = $("body").clone();
  allText.find("script, style, noscript, template").remove();
  const visibleText = allText.text().replace(/\s+/g, " ").trim();
  const words = visibleText.split(/\s+/).filter((w) => w.length > 1);
  const wordCount = words.length;
  const textRatio = input.html.length ? (visibleText.length / input.html.length) * 100 : 0;
  const sentenceCount = Math.max(1, (visibleText.match(/[.!?]+\s/g) ?? []).length + 1);
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);
  const readingEase = wordCount
    ? clamp(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount))
    : 0;
  const inlineFixedWidth = /width:\s*(?:[5-9]\d\d|[1-9]\d{3,})px/i.test(input.html);
  const zoomBlocked = /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport);
  const mixedContent = isHttps
    ? $("[src], [href]")
        .toArray()
        .filter((el) => /^http:\/\//i.test($(el).attr("src") ?? $(el).attr("href") ?? "")).length
    : 0;

  const hsts = !!header(input.headers, "strict-transport-security");
  const csp = !!header(input.headers, "content-security-policy");
  const xFrameOptions = !!header(input.headers, "x-frame-options");
  const xContentTypeOptions = !!header(input.headers, "x-content-type-options");
  const referrerPolicy = !!header(input.headers, "referrer-policy");
  const permissionsPolicy = !!header(input.headers, "permissions-policy");
  const cacheControl = !!header(input.headers, "cache-control");
  const encoding = header(input.headers, "content-encoding").toLowerCase();
  const compression = ["br", "gzip", "zstd", "deflate"].some((v) => encoding.includes(v));
  const serverDisclosure = header(input.headers, "server") || header(input.headers, "x-powered-by");

  // --- Performance & delivery ------------------------------------------------
  const ttfb = input.responseTimeMs;
  add(
    "performance",
    "ttfb",
    "Server response time",
    ttfb <= 400 ? "pass" : ttfb <= 1200 ? "warn" : "fail",
    `Initial HTML response completed in ${ttfb} ms (server-side measurement, not a lab LCP).`,
    4,
    {
      evidence: `${ttfb} ms`,
      fix: "Improve server caching, use a CDN edge close to visitors, and reduce backend work on the critical path.",
      why: "A slow first byte delays every subsequent render step.",
      impact: "Faster first paint and better perceived responsiveness.",
      effort: "Involved",
    },
  );
  add(
    "performance",
    "html-weight",
    "HTML payload size",
    htmlBytes <= 100_000 ? "pass" : htmlBytes <= 300_000 ? "warn" : "fail",
    `The HTML document is ${(htmlBytes / 1024).toFixed(1)} KB.`,
    2,
    {
      evidence: `${(htmlBytes / 1024).toFixed(1)} KB`,
      fix: "Remove unused inline markup and defer non-critical content to secondary requests.",
      why: "Large HTML documents delay parsing and increase transfer time.",
      impact: "Lower transfer cost and earlier content rendering.",
      effort: "Moderate",
    },
  );
  add(
    "performance",
    "compression",
    "Response compression",
    compression ? "pass" : "warn",
    compression
      ? `Content-Encoding: ${encoding} was advertised by the server.`
      : "No compressed content-encoding header was observed on the HTML response.",
    3,
    {
      fix: "Enable Brotli or gzip compression for HTML and text assets at the server or CDN.",
      why: "Compression substantially reduces bytes transferred over the network.",
      impact: "Smaller payloads, especially on mobile connections.",
      effort: "Easy",
    },
  );
  add(
    "performance",
    "cache-control",
    "Browser caching policy",
    cacheControl ? "pass" : "warn",
    cacheControl
      ? `Cache-Control: ${header(input.headers, "cache-control")}`
      : "No Cache-Control header was returned for the document.",
    2,
    {
      fix: "Set an explicit Cache-Control policy for HTML and immutable hashed assets.",
      why: "Clear cache rules let browsers avoid unnecessary network requests.",
      impact: "Faster repeat visits and lower origin load.",
      effort: "Easy",
    },
  );
  add(
    "performance",
    "render-blocking",
    "Render-blocking head scripts",
    blockingScripts === 0 ? "pass" : blockingScripts <= 2 ? "warn" : "fail",
    `${blockingScripts} of ${headScripts.length} head scripts lack async, defer or type="module".`,
    3,
    {
      fix: "Add defer or async to non-critical scripts, or move them before the closing body tag.",
      why: "Parser-blocking scripts stop HTML rendering until they download and execute.",
      impact: "Earlier first paint and lower main-thread blocking.",
      effort: "Easy",
    },
  );
  add(
    "performance",
    "third-party",
    "Third-party script footprint",
    externalScriptHosts.size <= 2 ? "pass" : externalScriptHosts.size <= 5 ? "warn" : "fail",
    `${externalScriptHosts.size} distinct external script host${externalScriptHosts.size === 1 ? "" : "s"} detected.`,
    2,
    {
      fix: "Audit third-party tags and load only business-critical vendors, preferably with async loading.",
      why: "Every third-party host adds DNS, connection and execution uncertainty.",
      impact: "More predictable load times and reduced privacy exposure.",
      effort: "Moderate",
    },
  );
  add(
    "performance",
    "resource-hints",
    "Resource prioritization hints",
    resourceHints > 0 ? "pass" : "warn",
    resourceHints > 0
      ? `${resourceHints} preconnect/preload/dns-prefetch hint${resourceHints === 1 ? "" : "s"} present.`
      : "No preconnect, preload or dns-prefetch hints were found.",
    1,
    {
      fix: "Preconnect to critical origins and preload the hero image or primary font.",
      why: "Hints help the browser start important requests earlier.",
      impact: "Small but reliable improvement to critical-path timing.",
      effort: "Easy",
    },
  );
  if (images.length > 3) {
    add(
      "performance",
      "lazy-images",
      "Below-the-fold image loading",
      lazyImages > 0 ? "pass" : "warn",
      `${lazyImages} of ${images.length} images use loading="lazy".`,
      1,
      {
        fix: 'Add loading="lazy" to non-hero images while keeping the primary hero eagerly loaded.',
        why: "Deferring offscreen images conserves bandwidth for visible content.",
        impact: "Reduced initial transfer and faster visible rendering.",
        effort: "Easy",
      },
    );
  }

  // --- SEO --------------------------------------------------------------------
  add(
    "seo",
    "title",
    "Title tag",
    title && title.length >= 15 && title.length <= 70 ? "pass" : title ? "warn" : "fail",
    title ? `Title is ${title.length} characters: “${title.slice(0, 90)}”.` : "No title tag was found.",
    4,
    {
      fix: "Write a unique, descriptive title between 30 and 60 characters.",
      why: "The title is the primary label in search results and browser tabs.",
      impact: "Improved relevance and click-through from search.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "meta-description",
    "Meta description",
    description && description.length >= 60 && description.length <= 170 ? "pass" : description ? "warn" : "fail",
    description ? `Meta description is ${description.length} characters.` : "No meta description was found.",
    3,
    {
      fix: "Add a unique meta description of roughly 120–160 characters that summarizes the page.",
      why: "Descriptions often become the search result snippet.",
      impact: "More informative search listings.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "canonical",
    "Canonical URL",
    canonical ? "pass" : "warn",
    canonical ? `Canonical points to ${canonical.slice(0, 120)}.` : "No canonical link was declared.",
    2,
    {
      fix: "Add a self-referencing canonical link on each indexable page.",
      why: "Canonicals consolidate duplicate URLs and protect ranking signals.",
      impact: "Cleaner indexing of the preferred URL.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "h1",
    "Single primary heading",
    h1.length === 1 ? "pass" : h1.length === 0 ? "fail" : "warn",
    `${h1.length} H1 element${h1.length === 1 ? "" : "s"} found.`,
    3,
    {
      fix: "Use exactly one H1 that states the page's primary topic.",
      why: "A single H1 gives search engines and assistive technology a clear page subject.",
      impact: "Clearer document structure and topic relevance.",
      effort: "Easy",
    },
  );
  const firstHeadingLevel = headings.length
    ? Number($(headings[0]).prop("tagName")?.toString().replace("H", "") || 6)
    : 0;
  add(
    "seo",
    "heading-order",
    "Heading hierarchy",
    headings.length && firstHeadingLevel === 1 ? "pass" : "warn",
    headings.length
      ? `${headings.length} headings found; the first is H${firstHeadingLevel}.`
      : "No heading structure was found in the document.",
    1,
    {
      fix: "Start with H1 and descend through H2/H3 without skipping levels.",
      why: "Consistent heading order supports scanning and semantic understanding.",
      impact: "Better accessibility and content comprehension.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "indexability",
    "Indexability directives",
    !/(noindex|nofollow)/i.test(robotsMeta) ? "pass" : "fail",
    robotsMeta ? `Meta robots: ${robotsMeta}.` : "No restrictive meta robots directive present.",
    3,
    {
      fix: "Remove noindex from pages that should appear in search results.",
      why: "A noindex directive prevents the page from being indexed.",
      impact: "Restores organic search visibility.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "language",
    "Document language",
    language ? "pass" : "fail",
    language ? `<html lang="${language}"> is declared.` : "The html element has no lang attribute.",
    2,
    {
      fix: 'Declare the document language, for example <html lang="en">.',
      why: "Language metadata drives screen-reader pronunciation and regional targeting.",
      impact: "More accurate assistive technology and localization.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "social-preview",
    "Social preview metadata",
    ogTags >= 3 && twitterCard ? "pass" : ogTags > 0 ? "warn" : "fail",
    `${ogTags} Open Graph tags; Twitter card ${twitterCard || "not set"}.`,
    2,
    {
      fix: "Add og:title, og:description, og:image and a twitter:card tag.",
      why: "These tags control how links appear when shared.",
      impact: "Richer, more trustworthy social previews.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "structured-data",
    "Structured data",
    jsonLdBlocks > 0 ? "pass" : "warn",
    `${jsonLdBlocks} JSON-LD block${jsonLdBlocks === 1 ? "" : "s"} found in the HTML.`,
    1,
    {
      fix: "Add schema.org JSON-LD appropriate to the page, such as Organization or Article.",
      why: "Structured data helps search engines interpret entities on the page.",
      impact: "Eligibility for enhanced search presentations.",
      effort: "Moderate",
    },
  );
  add(
    "seo",
    "internal-links",
    "Internal link graph",
    internalLinkCount >= 3 ? "pass" : "warn",
    `${internalLinkCount} internal and ${links.length - internalLinkCount} other links detected in the HTML.`,
    1,
    {
      fix: "Link contextually to relevant pages using descriptive anchor text.",
      why: "Internal links distribute discoverability and help visitors navigate.",
      impact: "Improved crawlability and deeper engagement.",
      effort: "Moderate",
    },
  );
  add(
    "seo",
    "robots-txt",
    "robots.txt availability",
    input.robotsReachable ? "pass" : "warn",
    input.robotsReachable ? "robots.txt returned a successful response." : "robots.txt was not reachable during this scan.",
    1,
    {
      fix: "Publish a valid robots.txt at the site root and reference your sitemap in it.",
      why: "Crawl directives give search engines clear guidance.",
      impact: "More predictable crawling.",
      effort: "Easy",
    },
  );
  add(
    "seo",
    "sitemap",
    "XML sitemap availability",
    input.sitemapReachable ? "pass" : "warn",
    input.sitemapReachable ? "sitemap.xml returned a successful response." : "sitemap.xml was not reachable during this scan.",
    1,
    {
      fix: "Publish an up-to-date XML sitemap and submit it in Search Console.",
      why: "Sitemaps help search engines discover important pages.",
      impact: "Faster discovery of new and updated pages.",
      effort: "Easy",
    },
  );

  // --- Accessibility ----------------------------------------------------------
  add(
    "accessibility",
    "alt-text",
    "Image alternative text",
    imagesMissingAlt === 0 ? "pass" : imagesMissingAlt <= 2 ? "warn" : "fail",
    images.length
      ? `${imagesMissingAlt} of ${images.length} images have no alt attribute.`
      : "No images were present in the HTML.",
    4,
    {
      fix: 'Add descriptive alt text to informative images and alt="" to decorative ones.',
      why: "Screen readers and search engines rely on alt text to understand images.",
      impact: "Broader access and stronger image context.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "form-labels",
    "Form control labels",
    unlabeledControls === 0 ? "pass" : "warn",
    formControls
      ? `${unlabeledControls} of ${formControls} form controls lack an accessible label.`
      : "No form controls were present in the HTML.",
    3,
    {
      fix: "Associate every input with a visible <label> or an aria-label.",
      why: "Unlabeled controls cannot be reliably announced by assistive technology.",
      impact: "Forms become usable for keyboard and screen-reader visitors.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "action-names",
    "Named interactive actions",
    namelessActions === 0 ? "pass" : "warn",
    namelessActions === 0
      ? "All buttons and links have discernible text or an accessible name."
      : `${namelessActions} buttons/links have no discernible accessible name.`,
    3,
    {
      fix: "Provide visible text, aria-label, or descriptive alt text for icon-only controls.",
      why: "Unnamed controls are ambiguous to screen-reader users.",
      impact: "Clearer navigation for everyone.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "landmarks",
    "Semantic landmarks",
    landmarks >= 3 ? "pass" : landmarks > 0 ? "warn" : "fail",
    `${landmarks} semantic landmark element${landmarks === 1 ? "" : "s"} detected.`,
    2,
    {
      fix: "Use header, nav, main and footer elements to define page regions.",
      why: "Landmarks let assistive technology jump directly to page regions.",
      impact: "Faster keyboard and screen-reader navigation.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "skip-link",
    "Skip-to-content link",
    skipLink ? "pass" : "warn",
    skipLink ? "A skip link is present." : "No skip-to-content link was detected.",
    1,
    {
      fix: "Add a keyboard-visible skip link targeting the main content region.",
      why: "Skip links let keyboard users bypass repeated navigation.",
      impact: "Lower interaction cost for keyboard users.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "anchor-text",
    "Descriptive link text",
    genericAnchors === 0 ? "pass" : "warn",
    genericAnchors === 0
      ? "No generic “click here” style anchor text was found."
      : `${genericAnchors} link${genericAnchors === 1 ? " uses" : "s use"} generic anchor text.`,
    1,
    {
      fix: "Replace generic link text with the destination or action name.",
      why: "Link lists read out of context in assistive technology.",
      impact: "More navigable content for all users.",
      effort: "Easy",
    },
  );
  add(
    "accessibility",
    "contrast-manual",
    "Color contrast (manual check)",
    "info",
    "Automated contrast evaluation requires rendered CSS and a browser. This engine does not guess contrast ratios.",
    0,
  );

  // --- Security & trust -------------------------------------------------------
  add(
    "security",
    "https",
    "HTTPS delivery",
    isHttps ? "pass" : "fail",
    isHttps ? "The final page was served over HTTPS." : "The final page was served over plain HTTP.",
    5,
    {
      fix: "Serve all pages over HTTPS and redirect HTTP traffic to the secure origin.",
      why: "Unencrypted traffic can be read or modified in transit.",
      impact: "Protected user data and preserved browser trust signals.",
      effort: "Moderate",
    },
  );
  add(
    "security",
    "hsts",
    "HTTP Strict Transport Security",
    hsts ? "pass" : "warn",
    hsts ? "Strict-Transport-Security header present." : "No HSTS header was returned.",
    3,
    {
      fix: "Send Strict-Transport-Security with a long max-age once HTTPS is stable.",
      why: "HSTS prevents protocol downgrade attacks on repeat visits.",
      impact: "Stronger transport guarantees.",
      effort: "Easy",
    },
  );
  add(
    "security",
    "csp",
    "Content Security Policy",
    csp ? "pass" : "warn",
    csp ? "Content-Security-Policy header present." : "No Content-Security-Policy header was returned.",
    3,
    {
      fix: "Define a CSP that restricts script, style and connection sources; start in report-only mode.",
      why: "CSP limits the damage possible from injected scripts.",
      impact: "Reduced cross-site scripting exposure.",
      effort: "Involved",
    },
  );
  add(
    "security",
    "frame-protection",
    "Clickjacking protection",
    xFrameOptions ? "pass" : "warn",
    xFrameOptions ? "X-Frame-Options header present." : "No X-Frame-Options or CSP frame-ancestors directive was detected.",
    2,
    {
      fix: "Set X-Frame-Options: SAMEORIGIN or a CSP frame-ancestors directive.",
      why: "Framing protections prevent UI redressing attacks.",
      impact: "Safer embedding behavior.",
      effort: "Easy",
    },
  );
  add(
    "security",
    "content-type-options",
    "MIME sniffing protection",
    xContentTypeOptions ? "pass" : "warn",
    xContentTypeOptions ? "X-Content-Type-Options: nosniff present." : "X-Content-Type-Options was not returned.",
    1,
    {
      fix: "Send X-Content-Type-Options: nosniff on all responses.",
      why: "MIME sniffing can cause unexpected content execution.",
      impact: "Reduced content-type confusion risk.",
      effort: "Easy",
    },
  );
  add(
    "security",
    "privacy-headers",
    "Privacy and capability headers",
    referrerPolicy && permissionsPolicy ? "pass" : referrerPolicy || permissionsPolicy ? "warn" : "fail",
    `Referrer-Policy: ${referrerPolicy ? "set" : "missing"}; Permissions-Policy: ${permissionsPolicy ? "set" : "missing"}.`,
    1,
    {
      fix: "Set a strict Referrer-Policy and a Permissions-Policy limiting unused browser capabilities.",
      why: "These headers reduce incidental data sharing and feature exposure.",
      impact: "Better privacy posture with minimal engineering effort.",
      effort: "Easy",
    },
  );
  add(
    "security",
    "mixed-content",
    "Mixed content",
    mixedContent === 0 ? "pass" : "fail",
    mixedContent === 0
      ? "No insecure http:// subresources found in the HTML."
      : `${mixedContent} insecure http:// subresource references found on an HTTPS page.`,
    2,
    {
      fix: "Load every subresource over HTTPS or use protocol-relative-free absolute HTTPS URLs.",
      why: "Browsers block or warn on insecure assets loaded from secure pages.",
      impact: "Fewer blocked assets and a consistent secure experience.",
      effort: "Easy",
    },
  );
  add(
    "security",
    "server-disclosure",
    "Server version disclosure",
    !/\d+\.\d+/.test(serverDisclosure) && !!serverDisclosure ? "pass" : !serverDisclosure ? "pass" : "warn",
    serverDisclosure ? `Server header: ${serverDisclosure.slice(0, 80)}.` : "No server/technology version header was advertised.",
    1,
    {
      fix: "Remove version numbers from Server and X-Powered-By headers.",
      why: "Version disclosure simplifies targeted vulnerability scanning.",
      impact: "Small reduction in information exposure.",
      effort: "Easy",
    },
  );
  const trustLinks = links
    .map((el) => `${$(el).attr("href") ?? ""} ${$(el).text()}`)
    .join(" ")
    .toLowerCase();
  const privacyPresent = /privacy|data protection|gdpr/.test(trustLinks);
  const termsPresent = /terms|conditions/.test(trustLinks);
  const contactPresent = /mailto:|tel:|contact|support/.test(trustLinks);
  add(
    "security",
    "trust-signals",
    "Visible trust signals",
    privacyPresent && termsPresent && contactPresent ? "pass" : privacyPresent || contactPresent ? "warn" : "fail",
    `Privacy policy: ${privacyPresent ? "found" : "missing"}; terms: ${termsPresent ? "found" : "missing"}; contact: ${contactPresent ? "found" : "missing"} (HTML links only).`,
    2,
    {
      fix: "Link a privacy policy, terms, and a clear contact channel from the page footer.",
      why: "Transparency signals help visitors and procurement teams evaluate a vendor.",
      impact: "Higher perceived credibility and clearer compliance posture.",
      effort: "Easy",
    },
  );

  // --- Content & clarity ------------------------------------------------------
  add(
    "content",
    "word-count",
    "Substantive page copy",
    wordCount >= 300 ? "pass" : wordCount >= 120 ? "warn" : "fail",
    `${wordCount} words of visible text were extracted from the HTML.`,
    3,
    {
      fix: "Expand the page with specific, useful information about the offer and its audience.",
      why: "Thin pages give visitors and crawlers little context to evaluate.",
      impact: "Better comprehension and topical coverage.",
      effort: "Moderate",
    },
  );
  add(
    "content",
    "text-ratio",
    "Text-to-markup ratio",
    textRatio >= 15 ? "pass" : textRatio >= 8 ? "warn" : "fail",
    `Visible text represents ${textRatio.toFixed(1)}% of the HTML source.`,
    2,
    {
      fix: "Reduce boilerplate markup and ensure primary content exists in server-rendered HTML.",
      why: "Very low text ratios can indicate heavy templates or client-only content.",
      impact: "More robust indexing and faster meaningful content.",
      effort: "Moderate",
    },
  );
  add(
    "content",
    "readability",
    "Reading ease",
    readingEase >= 55 ? "pass" : readingEase >= 35 ? "warn" : "fail",
    `Estimated Flesch reading ease: ${readingEase}/100 (heuristic based on extracted text).`,
    2,
    {
      fix: "Shorten sentences, prefer plain language, and break dense passages into scannable sections.",
      why: "Difficult copy increases cognitive effort and abandonment.",
      impact: "Clearer messaging across reading levels.",
      effort: "Moderate",
    },
  );
  add(
    "content",
    "headline-clarity",
    "Primary message clarity",
    h1[0] && h1[0].length >= 20 && h1[0].length <= 110 ? "pass" : h1[0] ? "warn" : "fail",
    h1[0] ? `Primary H1: “${h1[0].slice(0, 120)}”.` : "No primary H1 message was found.",
    2,
    {
      fix: "Write a specific benefit-oriented headline of roughly 20–90 characters.",
      why: "Visitors decide whether to continue based on the headline.",
      impact: "Stronger comprehension above the fold.",
      effort: "Easy",
    },
  );
  add(
    "content",
    "cta-quality",
    "Call-to-action specificity",
    genericAnchors === 0 ? "pass" : "warn",
    genericAnchors === 0
      ? "No generic CTA phrases were detected in link text."
      : `${genericAnchors} generic CTA phrase${genericAnchors === 1 ? "" : "s"} detected in link text.`,
    1,
    {
      fix: "Use action-plus-outcome CTA copy such as “Book a strategy call”.",
      why: "Specific CTAs set expectations and reduce hesitation.",
      impact: "More purposeful conversion paths.",
      effort: "Easy",
    },
  );
  add(
    "content",
    "design-manual",
    "Visual design quality (manual check)",
    "info",
    "Aesthetic judgments such as balance, hierarchy and brand consistency require a rendered screenshot and human review; this engine does not assign a made-up design score.",
    0,
  );

  // --- Mobile readiness -------------------------------------------------------
  add(
    "mobile",
    "viewport",
    "Responsive viewport",
    /width\s*=\s*device-width/i.test(viewport) ? "pass" : "fail",
    viewport ? `Viewport: ${viewport}.` : "No viewport meta tag was found.",
    4,
    {
      fix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1">.',
      why: "Without it, mobile browsers render a zoomed desktop layout.",
      impact: "Correct rendering on phones and tablets.",
      effort: "Easy",
    },
  );
  add(
    "mobile",
    "zoom",
    "Zoom accessibility",
    !zoomBlocked ? "pass" : "fail",
    zoomBlocked ? "The viewport disables or restricts pinch zoom." : "Pinch zoom is not disabled.",
    3,
    {
      fix: "Remove user-scalable=no and restrictive maximum-scale values.",
      why: "Zoom is essential for low-vision users on mobile devices.",
      impact: "WCAG-aligned zoom behavior.",
      effort: "Easy",
    },
  );
  add(
    "mobile",
    "fixed-width",
    "Fixed-width layout risk",
    !inlineFixedWidth ? "pass" : "warn",
    inlineFixedWidth
      ? "An inline fixed pixel width above 500px was detected in the HTML."
      : "No large inline fixed-width containers were detected.",
    2,
    {
      fix: "Replace fixed pixel widths with max-width, percentages or responsive container queries.",
      why: "Fixed widths overflow narrow viewports.",
      impact: "Fewer horizontal scroll issues on small screens.",
      effort: "Moderate",
    },
  );
  add(
    "mobile",
    "image-dimensions",
    "Image dimensions / CLS risk",
    imagesMissingDimensions === 0 ? "pass" : images.length > 3 ? "warn" : "pass",
    images.length
      ? `${imagesMissingDimensions} of ${images.length} images omit width/height attributes.`
      : "No images to evaluate for dimension hints.",
    2,
    {
      fix: "Add width and height (or aspect-ratio) to every image to reserve layout space.",
      why: "Missing dimensions cause content to jump while images load.",
      impact: "Lower layout shift and a calmer mobile experience.",
      effort: "Easy",
    },
  );
  add(
    "mobile",
    "responsive-styles",
    "Responsive stylesheet signals",
    stylesheets > 0 ? "pass" : "warn",
    stylesheets > 0
      ? `${stylesheets} stylesheet link${stylesheets === 1 ? "" : "s"} found (media queries inside external CSS are not inspected).`
      : "No external stylesheet link was found in the HTML.",
    1,
    {
      fix: "Use responsive CSS with fluid type, flexible grids and breakpoint-based layout rules.",
      why: "External CSS drives how a page adapts to viewport size.",
      impact: "More consistent layouts across device widths.",
      effort: "Moderate",
    },
  );
  add(
    "mobile",
    "touch-targets-manual",
    "Touch target sizes (manual check)",
    "info",
    "Actual control sizes require computed CSS and a rendered viewport; this engine does not estimate them.",
    0,
  );

  // --- Scores -----------------------------------------------------------------
  const scores = {} as Scores;
  for (const key of CATEGORY_KEYS) {
    const relevant = checks.filter((c) => c.category === key && c.status !== "info");
    const totalWeight = relevant.reduce((sum, c) => sum + c.weight, 0);
    const earned = relevant.reduce((sum, c) => {
      const points = statusPoints(c.status);
      return sum + (points === null ? 0 : points * c.weight);
    }, 0);
    scores[key] = totalWeight ? Math.round(earned / totalWeight) : 0;
  }
  scores.overall = Math.round(
    CATEGORY_KEYS.reduce((sum, key) => sum + scores[key] * CATEGORY_META[key].weight, 0),
  );

  // --- Recommendations --------------------------------------------------------
  const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const recommendations: Recommendation[] = checks
    .filter((c) => (c.status === "fail" || c.status === "warn") && !!c.fix)
    .map((c): Recommendation => {
      const priority: Priority =
        c.status === "fail" || c.weight >= 4 ? "high" : c.weight >= 2 ? "medium" : "low";
      return {
        id: c.id,
        category: c.category,
        title: `Fix: ${c.label}`,
        priority,
        effort: c.effort ?? "Moderate",
        why: c.why ?? c.detail,
        fix: c.fix ?? "",
        impact: c.impact ?? "Improves this category score and user experience.",
      };
    })
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        (checks.find((c) => c.id === b.id)?.weight ?? 0) -
          (checks.find((c) => c.id === a.id)?.weight ?? 0),
    )
    .slice(0, 14);

  const quickWins = recommendations
    .filter((r) => r.effort === "Easy")
    .slice(0, 3)
    .map((r) => r.fix);

  const orderedCategories = [...CATEGORY_KEYS].sort((a, b) => scores[b] - scores[a]);
  const strongest = orderedCategories[0];
  const weakest = orderedCategories[orderedCategories.length - 1];
  const failingCount = checks.filter((c) => c.status === "fail").length;
  const warningCount = checks.filter((c) => c.status === "warn").length;
  const summary = `Aimirah Signal inspected ${new URL(finalUrl).hostname} across ${checks.filter((c) => c.status !== "info").length} scored HTTP and HTML signals. The overall score is ${scores.overall}/100. ${CATEGORY_META[strongest].short} is the strongest measured area at ${scores[strongest]}/100, while ${CATEGORY_META[weakest].short} needs the most attention at ${scores[weakest]}/100. We found ${failingCount} failing and ${warningCount} cautionary signals. ${recommendations[0] ? `The highest-priority next step is to ${recommendations[0].fix.charAt(0).toLowerCase()}${recommendations[0].fix.slice(1)}` : "No material issues were detected in the signals this engine can measure."} Scores are deterministic server-side heuristics, not browser-rendered Lighthouse results or an aesthetic judgment.`;

  const metrics: AuditMetric[] = [
    {
      label: "Response time",
      value: `${input.responseTimeMs} ms`,
      note: "HTML response, server-side",
      state: input.responseTimeMs <= 400 ? "good" : input.responseTimeMs <= 1200 ? "warn" : "bad",
    },
    {
      label: "HTML size",
      value: `${(htmlBytes / 1024).toFixed(1)} KB`,
      note: "Document bytes only",
      state: htmlBytes <= 100_000 ? "good" : htmlBytes <= 300_000 ? "warn" : "bad",
    },
    { label: "HTTP status", value: String(input.statusCode), note: "Final response", state: input.statusCode < 400 ? "good" : "bad" },
    { label: "Redirects", value: String(input.redirectCount), note: "Hops followed", state: input.redirectCount <= 1 ? "good" : "warn" },
    { label: "Visible words", value: wordCount.toLocaleString("en-US"), note: "Extracted from body", state: wordCount >= 300 ? "good" : "warn" },
    { label: "Text ratio", value: `${textRatio.toFixed(1)}%`, note: "Text / HTML source", state: textRatio >= 15 ? "good" : "warn" },
    { label: "Scripts", value: String(scripts.length), note: `${externalScriptHosts.size} external hosts`, state: scripts.length <= 8 ? "good" : "warn" },
    { label: "Images", value: String(images.length), note: `${imagesMissingAlt} missing alt`, state: imagesMissingAlt === 0 ? "good" : "warn" },
    { label: "Links", value: String(links.length), note: `${internalLinkCount} internal`, state: "neutral" },
    { label: "Security headers", value: `${[hsts, csp, xFrameOptions, xContentTypeOptions, referrerPolicy, permissionsPolicy].filter(Boolean).length}/6`, note: "Core response headers", state: "neutral" },
  ];

  const page: PageFacts = {
    title,
    description,
    canonical,
    language,
    h1,
    headingCount: headings.length,
    wordCount,
    textRatio: Number(textRatio.toFixed(1)),
    imageCount: images.length,
    imagesMissingAlt,
    scriptCount: scripts.length,
    stylesheetCount: stylesheets,
    linkCount: links.length,
    internalLinkCount,
    externalLinkCount: links.length - internalLinkCount,
    formControls,
    unlabeledControls,
    jsonLdBlocks,
    ogTags,
    genericAnchors,
  };
  const securityHeaders: SecurityHeaderFacts = {
    hsts,
    csp,
    xFrameOptions,
    xContentTypeOptions,
    referrerPolicy,
    permissionsPolicy,
    cacheControl,
    compression,
    serverDisclosure,
  };

  if (input.source === "fixture") {
    warnings.unshift(
      "Sample mode: this report audits a bundled HTML fixture. It is reproducible offline and does not represent a live website.",
    );
  }
  if (!input.lighthouse) {
    warnings.push(
      "Google Lighthouse lab metrics were not included (PAGESPEED_API_KEY is not configured). Performance scoring uses measured HTTP/HTML signals only.",
    );
  }

  return {
    schemaVersion: 2,
    engineVersion: ENGINE_VERSION,
    source: input.source,
    sourceLabel:
      input.source === "fixture" ? "Bundled sample fixture" : "Live HTTP + HTML inspection",
    url: input.url,
    normalizedUrl: input.normalizedUrl,
    finalUrl,
    host: new URL(finalUrl).hostname,
    analyzedAt: new Date().toISOString(),
    durationMs: input.durationMs,
    statusCode: input.statusCode,
    scores,
    checks,
    recommendations,
    quickWins,
    summary,
    summarySource: "deterministic",
    metrics,
    page,
    securityHeaders,
    lighthouse: input.lighthouse,
    limitations: [
      "A single server-side HTML fetch cannot measure rendered color contrast, touch target sizes, visual design quality, JavaScript-rendered content, or real-user Core Web Vitals.",
      "Scores are transparent weighted heuristics, not official Google Lighthouse scores unless the optional PageSpeed Insights integration is configured.",
      "External CSS, images and JavaScript files are counted but not executed or rendered.",
      "Results reflect the single URL requested at scan time; they are not a full-site crawl or a security penetration test.",
    ],
    warnings,
  };
}
