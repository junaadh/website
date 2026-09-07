import palette from "../../src/data/palette.json";

export type Stats = {
  login: string;
  name: string;
  /** How many of `repos` were private, so the card can be honest about it. */
  privateRepos: number;
  commits: number;
  stars: number;
  pullRequests: number;
  issues: number;
  contributedTo: number;
  followers: number;
  repos: number;
  languages: { name: string; colour: string; share: number }[];
};

const QUERY = `query($login:String!){
  user(login:$login){
    name login followers{totalCount}
    contributionsCollection{ totalCommitContributions restrictedContributionsCount }
    repositoriesContributedTo(first:1, contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY]){ totalCount }
    pullRequests(first:1){ totalCount }
    issues(first:1){ totalCount }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, orderBy:{field:STARGAZERS,direction:DESC}){
      totalCount
      nodes{ isPrivate stargazerCount languages(first:5, orderBy:{field:SIZE,direction:DESC}){
        edges{ size node{ name color } } } }
    }
  }
}`;

/** Only the fields QUERY actually selects. */
type GraphQlUser = {
  login: string;
  name: string | null;
  followers: { totalCount: number };
  contributionsCollection: {
    totalCommitContributions: number;
    restrictedContributionsCount: number;
  };
  repositoriesContributedTo: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  repositories: {
    totalCount: number;
    nodes: {
      isPrivate: boolean;
      stargazerCount: number;
      languages: {
        edges: { size: number; node: { name: string; color: string | null } }[];
      };
    }[];
  };
};

/**
 * Private repositories are included when the token can see them. That needs only
 * `Metadata: Read-only` — enough for names, languages and stars, and explicitly
 * *not* code, issues, PRs, Actions or secrets. Repository names are never
 * rendered; only aggregate language bytes and counts reach the card.
 *
 * `includePrivate: false` drops them regardless of token scope, so the card can
 * be public-only even when the credential is broader.
 */
export async function fetchStats(
  login: string,
  token: string,
  includePrivate = true,
): Promise<Stats> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "junaadh.dev-stats",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  const payload = (await response.json()) as {
    errors?: { message: string }[];
    data?: { user: GraphQlUser | null };
  };
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  const user = payload.data?.user;
  if (!user) throw new Error(`No such user: ${login}`);

  const visible = user.repositories.nodes.filter(
    (repo) => includePrivate || !repo.isPrivate,
  );
  const sizes = new Map<string, { colour: string; size: number }>();
  let stars = 0;
  for (const repo of visible) {
    stars += repo.stargazerCount;
    for (const edge of repo.languages.edges) {
      const found = sizes.get(edge.node.name);
      if (found) found.size += edge.size;
      else
        sizes.set(edge.node.name, {
          colour: edge.node.color ?? "#8b949e",
          size: edge.size,
        });
    }
  }
  const total = [...sizes.values()].reduce((sum, item) => sum + item.size, 0) || 1;
  const languages = [...sizes.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .map(([name, item]) => ({
      name,
      colour: item.colour,
      share: item.size / total,
    }));

  const contributions = user.contributionsCollection;
  return {
    login: user.login,
    name: user.name ?? user.login,
    privateRepos: visible.filter((repo) => repo.isPrivate).length,
    // Private contributions are included when the token is allowed to see them.
    commits:
      contributions.totalCommitContributions +
      contributions.restrictedContributionsCount,
    stars,
    pullRequests: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    followers: user.followers.totalCount,
    repos: includePrivate ? user.repositories.totalCount : visible.length,
    languages,
  };
}

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
        c
      ]!,
  );

const compact = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

/**
 * Self-contained SVG: no external fonts, no <image>, no CSS imports — GitHub
 * proxies README images through camo and strips anything that would fetch.
 */
export function renderCard(stats: Stats, theme: "dark" | "light") {
  const c = palette[theme];
  const width = 460;
  const height = 200;

  const rows: [string, number][] = [
    ["Commits", stats.commits],
    ["Stars", stats.stars],
    ["Pull requests", stats.pullRequests],
    ["Repositories", stats.repos],
  ];

  const stat = rows
    .map(([label, value], index) => {
      const x = 28 + (index % 2) * 210;
      const y = 82 + Math.floor(index / 2) * 34;
      return `<text x="${x}" y="${y}" fill="${c.muted}" font-size="12">${label}</text><text x="${x + 178}" y="${y}" text-anchor="end" fill="${c.accent}" font-size="13" font-weight="600">${compact(value)}</text>`;
    })
    .join("");

  /* One bar, split proportionally. Boundaries are rounded to whole pixels and
     each segment starts exactly where the last ended: fractional edges get
     anti-aliased, and on a 7px bar that blur reads as segments sitting at
     different heights. Integer tiling also removes the sub-pixel overlaps that
     accumulated rounding produced. */
  const barX = 28;
  const barWidth = width - 56;
  let cursor = barX;
  let covered = 0;
  const bar = stats.languages
    .map((language) => {
      covered += language.share;
      const end = Math.round(barX + Math.min(1, covered) * barWidth);
      const segment = Math.max(2, end - cursor);
      const rect = `<rect x="${cursor}" y="150" width="${segment}" height="7" fill="${language.colour}"/>`;
      cursor += segment;
      return rect;
    })
    .join("");

  const legend = stats.languages
    .map((language, index) => {
      const x = 28 + index * 88;
      return `<circle cx="${x + 4}" cy="176" r="4" fill="${language.colour}"/><text x="${x + 14}" y="180" fill="${c.muted}" font-size="11">${escape(language.name.slice(0, 10))}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub statistics for ${escape(stats.login)}">
<rect width="${width}" height="${height}" rx="8" fill="${c.bg}" stroke="${c["visual-line"]}"/>
<g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">
<text x="28" y="40" fill="${c.fg}" font-size="16" font-weight="600">${escape(stats.name)}</text>
<text x="28" y="58" fill="${c.faint}" font-size="11">@${escape(stats.login)} · ${compact(stats.followers)} followers${stats.privateRepos ? ` · incl. ${stats.privateRepos} private` : ""}</text>
${stat}
<text x="28" y="140" fill="${c.faint}" font-size="10" letter-spacing="1">MOST USED</text>
<g shape-rendering="crispEdges">${bar}</g>${legend}
</g></svg>`;
}
