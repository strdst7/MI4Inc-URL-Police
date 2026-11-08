import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HistoryClient } from "@/components/history-client";

export const metadata = { title: "Report history · Aimirah Signal" };

export default function ReportsPage() {
  return (
    <>
      <SiteHeader />
      <main><HistoryClient /></main>
      <SiteFooter />
    </>
  );
}
