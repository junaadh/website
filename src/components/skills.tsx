type SkillCategory = {
  category: string;
  details: string;
};

const skillCategories: SkillCategory[] = [
  {
    category: "Backend & Web Development",
    details: "Rust (Axum, Actix), TypeScript/JavaScript (Vite + React, Node.js) - building high-performance, scalable, and secure APIs and web applications.",
  },
  {
    category: "Mobile & Desktop Development",
    details: "Swift, SwiftUI, SwiftData, UIKit, React Native, Svelte - developing iOS and macOS applications with cloud integration, responsive UIs, and optimized performance.",
  },
  {
    category: "Systems & Low-Level Programming",
    details: "Rust, C/C++, Zig - writing efficient, memory-safe system software, CLI tools, and performance-critical modules.",
  },
  {
    category: "DevOps & Deployment",
    details: "Docker, Docker Compose, Docker Swarm, Colima, CI/CD pipelines, Caddy, Nginx, AWS, Cloudflare - containerizing applications, orchestrating services, automating deployments, and configuring secure infrastructure.",
  },
  {
    category: "Monitoring & Observability",
    details: "Prometheus, Grafana, Loki - implementing system monitoring, visualizing metrics, and aggregating logs for production environments.",
  },
  {
    category: "Server & Linux Administration",
    details: "Linux, VPS management, shell scripting - deploying and maintaining applications on Linux servers, configuring VPS environments, and managing server operations.",
  },
];

const Skill = () => {
  return (
    <section id="skills" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight">
        Skills
      </h2>
      <div className="max-w-3xl mx-auto space-y-6">
        {skillCategories.map((skillCategory) => (
          <article
            key={skillCategory.category}
            className="rounded-lg border bg-white dark:bg-black p-6 transition border-gray-300 dark:border-gray-800 text-left"
          >
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {skillCategory.category}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {skillCategory.details}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Skill;
