import type { MetadataRoute } from "next";
import { profile } from "@/lib/profile";

export const dynamic = "force-static";

// Colours are the HUD palette: the void background and the default accent.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: profile.meta.title,
    short_name: profile.person.name,
    description: profile.meta.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#03060b",
    theme_color: "#03060b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
