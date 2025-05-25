const skills = ["Rust", "C", "Zig", "Cybersecurity", "Embedded", "Python", "Tailwind", "React", "Typescript"];

const Skill = () => {
  return (
  <section id="skills" className="px-4 py-12">
  <h2 className="text-xl font-semibold mb-6 text-center">Skills</h2>
  <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
  {skills.map((skill) => (
  <span key={skill} className="px-5 h-12 flex justify-center items-center py-1 bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 text-sm rounded-2xl border border-gray-300 dark:border-gray-800">
  {skill}
  </span>
  ))}
  </div>
  </section>
  );
};

export default Skill;
