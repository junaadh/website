// Bundled stand-in for /api/card/<user>.json, used when the endpoint is not
// there (static dev without Pages Functions). Invented numbers, not a real profile.

import type { CardUser } from "./types";

const wave = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const v =
      Math.sin(i * 0.37 + seed) +
      Math.sin(i * 0.11 + seed * 2) +
      (i % 7 === 0 || i % 7 === 6 ? -0.8 : 0.4);
    return v < 0.2 ? 0 : Math.round((v - 0.2) * 5);
  });

export const SAMPLE_USER: CardUser = {
  login: "sample",
  name: "Sample Operator",
  bio: "Builds small tools, compilers and odd interfaces.",
  location: "Somewhere warm",
  followers: 128,
  following: 42,
  repos: 37,
  stars: 1520,
  forks: 210,
  commits: 614,
  pullRequests: 188,
  issues: 73,
  contributedTo: 24,
  joined: 2016,
  contributions: 1893,
  days: wave(371, 1.3),
  languages: [
    { name: "Rust", color: "#dea584", share: 0.38 },
    { name: "TypeScript", color: "#3178c6", share: 0.27 },
    { name: "Python", color: "#3572a5", share: 0.15 },
    { name: "Go", color: "#00add8", share: 0.1 },
    { name: "Shell", color: "#89e051", share: 0.06 },
    { name: "Other", color: "#8b949e", share: 0.04 },
  ],
  top: [
    { name: "forge", description: "A tiny build system", language: "Rust", stars: 910, forks: 96 },
    {
      name: "lantern",
      description: "Static site toolkit",
      language: "TypeScript",
      stars: 402,
      forks: 51,
    },
    { name: "dotfiles", description: "Home directory", language: "Shell", stars: 120, forks: 20 },
  ],
  avatar: "",
};
