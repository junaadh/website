import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Banner } from "@/components/console/Banner";
import { SiteProvider } from "@/components/console/SiteProvider";
import { TopBar } from "@/components/hud/TopBar";
import { profile, projectData } from "@/lib/profile";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: profile.meta.title, template: `%s — ${profile.person.name}` },
  description: profile.meta.description,
};

// Build year: the site is static, so this is when it was last deployed.
const YEAR = new Date().getFullYear();

export const viewport: Viewport = { themeColor: "#05080c" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <SiteProvider projects={projectData}>
          <div aria-hidden="true" className="backdrop" />
          <a
            href="#main"
            className="label sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-void focus:px-3 focus:py-2 focus:text-signal"
          >
            Skip to content
          </a>
          <TopBar handle={profile.person.handle} />
          <Banner />
          <main id="main" className="@container mx-auto max-w-6xl px-5">
            {children}
          </main>
          <footer className="mx-auto mt-32 flex max-w-6xl flex-wrap justify-between gap-4 border-t border-line px-5 py-8">
            <span className="label">
              © {YEAR} {profile.person.fullName}
            </span>
            <span className="label">Static build · Cloudflare edge</span>
          </footer>
        </SiteProvider>
      </body>
    </html>
  );
}
