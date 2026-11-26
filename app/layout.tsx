import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Banner } from "@/components/console/Banner";
import { SiteProvider } from "@/components/console/SiteProvider";
import { TopBar } from "@/components/hud/TopBar";
import { profile, projectData } from "@/lib/profile";
import { KEYWORDS, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(profile.links.website),
  applicationName: SITE_NAME,
  title: { default: profile.meta.title, template: `%s · ${profile.person.name}` },
  description: profile.meta.description,
  keywords: KEYWORDS,
  authors: [{ name: profile.person.fullName, url: profile.links.website }],
  creator: profile.person.fullName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_US",
    title: profile.meta.title,
    description: profile.meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: profile.meta.title,
    description: profile.meta.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

// Build year: the site is static, so this is when it was last deployed.
const YEAR = new Date().getFullYear();

export const viewport: Viewport = { themeColor: "#03060b", colorScheme: "dark" };

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
