type SkillCategory = {
  category: string;
  skills: string[];
};

const skillCategories: SkillCategory[] = [
  {
    category: "Backend & Web Development",
    skills: ["Rust", "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Axum", "Actix"],
  },
  {
    category: "Mobile & Desktop Development",
    skills: ["Swift", "SwiftUI", "SwiftData", "UIKit", "React Native"],
  },
  {
    category: "Systems & Low-Level Programming",
    skills: ["Rust", "C", "Cpp", "Zig"],
  },
  {
    category: "DevOps & Deployment",
    skills: ["Docker", "AWS", "Cloudflare", "Nginx", "Git"],
  },
  {
    category: "Monitoring & Observability",
    skills: ["Prometheus", "Grafana", "Loki"],
  },
];

// https://devicon.dev/?utm_source=chatgpt.com

const Skill = () => {
  return (
    <section id="skills" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight">
        Skills
      </h2>
      <div className="max-w-3xl mx-auto space-y-8">
        {skillCategories.map((category) => (
          <div key={category.category}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              {category.category}
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {category.skills.map((skill) => (
                <div
                  key={skill}
                  className="px-5 h-12 flex justify-center items-center py-1 bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 text-sm rounded-2xl border border-gray-300 dark:border-gray-800"
                >
                  <img
                    src={`/languages/${skill === "SwiftUI" ? "swift" : skill === "Cpp" ? "c++" : skill.toLowerCase()}.svg`}
                    alt={`${skill} logo`}
                    className="w-4 h-4 mr-2 dark:invert"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Skill;
