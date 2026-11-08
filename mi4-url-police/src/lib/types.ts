export const CATEGORY_KEYS = [
  "performance",
  "seo",
  "accessibility",
  "security",
  "content",
  "mobile",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; short: string; description: string; weight: number }
> = {
  performance: {
    label: "Performance & Delivery",
    short: "Performance",
    description: "Server response, payload weight, compression, caching and render-blocking resources.",
    weight: 0.2,
  },
  seo: {
    label: "Search Discoverability",
    short: "SEO",
    description: "Metadata, semantics, indexability, social previews and structured data.",
    weight: 0.2,
  },
  accessibility: {
    label: "Accessibility",
    short: "Accessibility",
    description: "Semantic structure, alternative text, form labels and navigable markup.",
    weight: 0.2,
  },
  security: {
    label: "Security & Trust",
    short: "Security",
    description: "Transport security, response headers, mixed content and trust signals.",
    weight: 0.15,
  },
  content: {
    label: "Content & Clarity",
    short: "Content",
    description: "Message depth, text ratio, readability and calls to action.",
    weight: 0.15,
  },
  mobile: {
    label: "Mobile Readiness",
    short: "Mobile",
    description: "Viewport configuration, zoom behavior and layout-shift risk in markup.",
    weight: 0.1,
  },
};

export type CheckStatus = "pass" | "warn" | "fail" | "info";
export type Effort = "Easy" | "Moderate" | "Involved";
export type Priority = "high" | "medium" | "low";

export interface AuditCheck {
  id: string;
  category: CategoryKey;
  label: string;
  status: CheckStatus;
  detail: string;
  evidence?: string;
  weight: number;
  fix?: string;
  why?: string;
  impact?: string;
  effort?: Effort;
}

export interface Recommendation {
  id: string;
  category: CategoryKey;
  title: string;
  priority: Priority;
  effort: Effort;
  why: string;
  fix: string;
  impact: string;
}

export type Scores = Record<CategoryKey, number> & { overall: number };

export interface PageFacts {
  title: string;
  description: string;
  canonical: string;
  language: string;
  h1: string[];
  headingCount: number;
  wordCount: number;
  textRatio: number;
  imageCount: number;
  imagesMissingAlt: number;
  scriptCount: number;
  stylesheetCount: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  formControls: number;
  unlabeledControls: number;
  jsonLdBlocks: number;
  ogTags: number;
  genericAnchors: number;
}

export interface SecurityHeaderFacts {
  hsts: boolean;
  csp: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
  cacheControl: boolean;
  compression: boolean;
  serverDisclosure: string;
}

export interface AuditMetric {
  label: string;
  value: string;
  note: string;
  state: "good" | "warn" | "bad" | "neutral";
}

export interface LighthouseSummary {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  metrics: { label: string; value: string; score: number | null }[];
  strategy: string;
}

export type ReportSource = "live" | "fixture" | "cached";

export interface ReportPayload {
  schemaVersion: number;
  engineVersion: string;
  source: ReportSource;
  sourceLabel: string;
  url: string;
  normalizedUrl: string;
  finalUrl: string;
  host: string;
  analyzedAt: string;
  durationMs: number;
  statusCode: number;
  scores: Scores;
  checks: AuditCheck[];
  recommendations: Recommendation[];
  quickWins: string[];
  summary: string;
  summarySource: "deterministic" | "ai";
  metrics: AuditMetric[];
  page: PageFacts;
  securityHeaders: SecurityHeaderFacts;
  lighthouse: LighthouseSummary | null;
  limitations: string[];
  warnings: string[];
}

export interface ReportRow {
  id: string;
  url: string;
  host: string;
  normalizedUrl: string;
  overallScore: number;
  scores: Scores;
  source: ReportSource;
  createdAt: string;
  durationMs: number;
}

export interface FullReport extends ReportRow {
  payload: ReportPayload;
}

export function statusPoints(status: CheckStatus): number | null {
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  if (status === "fail") return 15;
  return null;
}

export function scoreColor(score: number): string {
  if (score >= 85) return "#126B54";
  if (score >= 70) return "#B07A13";
  if (score >= 50) return "#C4622D";
  return "#B23A3A";
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 85) return "good";
  if (score >= 70) return "warn";
  return "bad";
}

export function shortScoreLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Needs polish";
  if (score >= 50) return "Needs attention";
  return "Critical";
}
