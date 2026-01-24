const skills = [
  "Rust",
  "Swift",
  "C",
  "C++",
  "Zig",
  "TypeScript",
  "JavaScript",
  "SwiftUI",
  "React",
  "Next.js",
  "AWS",
  "Git",
  "Cloudflare"
];
// https://devicon.dev/?utm_source=chatgpt.com 

const Skill = () => {
  return (
  <section id="skills" className="px-4 py-12">
  <h2 className="text-xl font-semibold mb-6 text-center">Skills</h2>
  <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
  {skills.map((skill) => (
  <div key={skill} className="px-5 h-12 flex justify-center items-center py-1 bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 text-sm rounded-2xl border border-gray-300 dark:border-gray-800">
    <img
      src={`/languages/${skill.toLowerCase()}.svg`}
      alt={`${skill} logo`}
      className="w-4 h-4 dark:invert mr-2"
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
    <span>{skill}</span>
  </div>
  ))}
  </div>
  </section>
  );
};

export default Skill;
