import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <Brand />
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, maxWidth: 340, marginTop: 14 }}>
              Measured website intelligence. Built for teams that prefer verifiable signals over
              opaque scores. Delaware, USA.
            </p>
          </div>
          <div className="footer-links">
            <Link href="/#analyze">New analysis</Link>
            <Link href="/reports">Report history</Link>
            <Link href="/compare">Compare scans</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/methodology#privacy">Privacy</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} MI4, Inc | aimirah-systems. All rights reserved.</span>
          <span>Aimirah Signal · Engine v2.0 · Informational audits, not a security certification.</span>
        </div>
      </div>
    </footer>
  );
}
