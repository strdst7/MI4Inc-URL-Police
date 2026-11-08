import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportWorkspace } from "@/components/report-workspace";
import { getFullReport } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getFullReport(id).catch(() => null);
  return {
    title: report
      ? `${report.host} · Aimirah Signal Report`
      : "Report not found · Aimirah Signal",
    description: report
      ? `Measured website audit for ${report.host}: overall signal score ${report.overallScore}/100.`
      : "This Aimirah Signal report is unavailable.",
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await getFullReport(id).catch(() => null);
  if (!report) notFound();
  return <ReportWorkspace report={report} />;
}
