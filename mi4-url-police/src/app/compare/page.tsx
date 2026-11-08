import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareClient } from "@/components/compare-client";

export const metadata = { title: "Compare scans · Aimirah Signal" };

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <main><CompareClient /></main>
      <SiteFooter />
    </>
  );
}
