type RepoData = {
  name: string;
  username: string;
  description: string;
  languages: string[];
};

const repos: RepoData[] = [
  {
    name: "OxideX",
    username: "oxidex",
    description: "A high-performance dynamic object runtime in rust inspired by Objective-C",
    languages: [ "rust" ],
  },
  {
    name: "PresenceKit",
    username: "PresenceKit",
    description: "Discord RPC for macOS",
    languages: [ "swift" ],
  },
  {
    name: "Discord Rpc Extension",
    username: "rise_code",
    description: "An extension for Helix Editor using Discord RPC",
    languages: [ "rust" ],
  },
  {
    name: "Web Server",
    username: "WebServer",
    description: "A simple tcp server written in aarch64 assembly",
    languages: [ "aarch64 asm" ],
  }
];

const username = "junaadh";

const Project = () => {
  return (
    <section id="projects" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight">
        Projects
      </h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {repos.map((repo) => (
          <a
            key={repo.name}
            href={`https://github.com/${username}/${repo.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg border bg-white dark:bg-black p-5 transition  border-gray-300 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-600"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {repo.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              @{repo.username}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {repo.description?.trim() || "A personal project on GitHub."}
            </p>
            <ul className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {repo.languages.map((lang) => (
                <li
                  key={lang}
                  className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800"
                >
                  {lang}
                </li>
              ))}
            </ul>
          </a>
        ))}
      </div>
    </section>
  );
};

export default Project;
