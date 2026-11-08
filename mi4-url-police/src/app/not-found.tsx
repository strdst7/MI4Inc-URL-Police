import Link from "next/link";
import { ArrowRight, FileQuestion } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shell" style={{ padding: "90px 0" }}>
        <div className="empty-state">
          <FileQuestion size={32} className="muted" />
          <h3 style={{ marginTop: 18, fontSize: 22 }}>That report is not available</h3>
          <p>The link may be incorrect, or the report was deleted from its originating workspace.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <Link href="/reports" className="btn-primary btn-sm">View report history</Link>
            <Link href="/#analyze" className="btn-outline btn-sm">Start a new analysis <ArrowRight size={14} /></Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
