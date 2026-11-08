"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, RefreshCw, ScanLine, Sparkles, X } from "lucide-react";
import { workspaceFetch } from "@/lib/workspace";

const STAGES = [
  "Resolving DNS and verifying a public destination",
  "Fetching the HTML document and checking redirects",
  "Inspecting transport security and response headers",
  "Parsing metadata, semantics and accessibility signals",
  "Scoring measured checks and prioritizing fixes",
  "Saving the report to your private workspace",
];

interface LaunchOptions {
  url?: string;
  mode?: "live" | "fixture";
  force?: boolean;
}

export function useScan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setProgress((value) => Math.min(92, value + (value < 60 ? 7 : 3)));
    }, 650);
    return () => clearInterval(timer);
  }, [loading]);

  async function launch(options: LaunchOptions) {
    setError(null);
    if (options.mode !== "fixture" && !options.url?.trim()) {
      setError("Enter a website URL to analyze.");
      return;
    }
    setProgress(6);
    setLoading(true);
    try {
      const response = await workspaceFetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: options.url ?? "",
          mode: options.mode ?? "live",
          force: options.force ?? false,
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "Analysis failed.");
      setProgress(100);
      router.push(`/report/${data.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Analysis failed. Please try again.",
      );
      setLoading(false);
    }
  }

  return {
    loading,
    progress,
    error,
    launch,
    dismissError: () => setError(null),
  };
}

export function ScanOverlay({
  loading,
  progress,
  error,
  onDismiss,
}: {
  loading: boolean;
  progress: number;
  error: string | null;
  onDismiss: () => void;
}) {
  if (!loading && !error) return null;
  const stageIndex = Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Analysis status">
      <div className="overlay-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="eyebrow on-dark">Aimirah Signal</span>
          {error && (
            <button className="btn-dark btn-sm btn-icon no-print" onClick={onDismiss} aria-label="Dismiss error">
              <X size={15} />
            </button>
          )}
        </div>
        {error ? (
          <div role="alert" style={{ marginTop: 24 }}>
            <AlertCircle size={32} color="#f0a9a3" />
            <h2 className="overlay-title">Analysis could not finish</h2>
            <p className="overlay-copy">{error}</p>
            <button className="btn-lime" style={{ marginTop: 24 }} onClick={onDismiss}>
              Try another URL
            </button>
          </div>
        ) : (
          <>
            <div className="spinner" style={{ marginTop: 28 }} />
            <h2 className="overlay-title">Auditing the live document</h2>
            <p className="overlay-copy">
              Every score is derived from a real HTTP response and parsed HTML. Nothing is simulated.
            </p>
            <div className="progress-track" aria-label={`Analysis progress ${progress}%`}>
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="scan-log" aria-live="polite">
              [{String(progress).padStart(3, "0")}%] {STAGES[stageIndex]}…
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SampleButton({
  className = "btn-dark btn-sm",
  label = "Explore sample report",
}: {
  className?: string;
  label?: string;
}) {
  const scan = useScan();
  return (
    <>
      <button className={className} onClick={() => scan.launch({ mode: "fixture" })} disabled={scan.loading}>
        <Sparkles size={15} /> {label}
      </button>
      <ScanOverlay {...scan} onDismiss={scan.dismissError} />
    </>
  );
}

export function ReScanButton({ url, className = "btn-outline btn-sm" }: { url: string; className?: string }) {
  const scan = useScan();
  return (
    <>
      <button
        className={className}
        onClick={() => scan.launch({ mode: "live", url, force: true })}
        disabled={scan.loading}
        title="Run a fresh live analysis of this URL"
      >
        <RefreshCw size={14} /> Re-scan
      </button>
      <ScanOverlay {...scan} onDismiss={scan.dismissError} />
    </>
  );
}

export function AnalyzeForm({
  variant = "hero",
  id,
}: {
  variant?: "hero" | "light";
  id?: string;
}) {
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const scan = useScan();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    if (!value) {
      setLocalError("Enter a website URL to analyze.");
      return;
    }
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("Only http and https URLs are supported.");
    } catch {
      setLocalError("That does not look like a valid website URL, e.g. example.com");
      return;
    }
    setLocalError(null);
    void scan.launch({ url: value });
  }

  return (
    <>
      <form
        id={id}
        className={`analyze-form${variant === "light" ? " light" : ""}`}
        onSubmit={submit}
      >
        <div className="input-shell">
          <ScanLine size={18} />
          <input
            className="field-input"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourwebsite.com"
            aria-label="Website URL"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (localError) setLocalError(null);
            }}
          />
          <button className="btn-lime" type="submit" disabled={scan.loading}>
            Analyze <ArrowRight size={16} />
          </button>
        </div>
        {(localError || scan.error) && <div className="form-error">{localError ?? scan.error}</div>}
        {!localError && !scan.error && (
          <p className="form-hint">
            Public pages only · No login required · Results stay in your private browser workspace
          </p>
        )}
      </form>
      <ScanOverlay {...scan} onDismiss={scan.dismissError} />
    </>
  );
}
