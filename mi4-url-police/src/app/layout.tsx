import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aimirah Signal — Website Intelligence by MI4, Inc",
  description:
    "Measured website audits for performance, SEO, accessibility, security, content and mobile readiness. Built by MI4, Inc | aimirah-systems.",
  applicationName: "Aimirah Signal",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
