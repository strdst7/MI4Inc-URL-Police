import type { FullReport } from "@/lib/types";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileBase(report: FullReport): string {
  return `aimirah-${report.host.replace(/[^a-z0-9.-]/gi, "-")}-${report.createdAt.slice(0, 10)}`;
}

export function exportJson(report: FullReport) {
  download(`${fileBase(report)}.json`, JSON.stringify(report, null, 2), "application/json");
}

function csvCell(value: unknown): string {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export function exportCsv(report: FullReport) {
  const rows = [
    ["category", "check", "status", "weight", "detail", "recommended_fix", "effort"],
    ...report.payload.checks.map((check) => [
      check.category,
      check.label,
      check.status,
      String(check.weight),
      check.detail,
      check.fix ?? "",
      check.effort ?? "",
    ]),
  ];
  download(
    `${fileBase(report)}-checks.csv`,
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
