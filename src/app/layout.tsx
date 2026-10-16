/**
 * Root layout for the App Router.
 *
 * Server Component, copied from transformer-explainer's layout (via the companion sites): HTML
 * scaffold, the global stylesheet and the site header. Dark mode follows
 * the system setting (`darkMode: "media"` in tailwind.config.ts).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/ui/SiteHeader";
import { SITE_URL } from "@/lib/site";
import { withShare } from "@/lib/share";

import "./globals.css";

export const metadata: Metadata = withShare("/", {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agent Orchestration Explained",
    template: "%s · Agent Orchestration Explained",
  },
  description:
    "Multi-step and multi-agent systems as discrete-event systems: LangGraph's execution model (super-steps, channels and reducers, checkpoints, interrupts, time travel) checked against real LangGraph, durable execution (replay, non-determinism, idempotency keys), multi-agent patterns, fan-out under rate limits, reliability and many workflows at scale, each animated by a tested engine.",
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
