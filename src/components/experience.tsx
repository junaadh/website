type ExperienceData = {
  company: string;
  location: string;
  position: string;
  period: string;
  responsibilities: string[];
};

const experiences: ExperienceData[] = [
  {
    company: "Alva Productions",
    location: "Subang Jaya, Malaysia",
    position: "Software Engineer Intern",
    period: "September 2025 - January 2026",
    responsibilities: [
      "Designed, developed, and refactored applications using SwiftUI",
      "Modelled application data flow using SwiftData with CloudKit integration",
      "Improved performance and responsiveness in Flutter applications",
      "Developed and maintained applications integrating Swift and Flutter components",
    ],
  },
  {
    company: "Dhiraagu",
    location: "Addu City, Maldives",
    position: "Customer Support Specialist",
    period: "April 2022 - December 2022",
    responsibilities: [],
  },
];

const Experience = () => {
  return (
    <section id="experience" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight">
        Experience
      </h2>
      <div className="max-w-3xl mx-auto">
        {experiences.map((exp) => (
          <div
            key={exp.company}
            className="rounded-lg border bg-white dark:bg-black p-6 transition border-gray-300 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-600 text-left"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {exp.company}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {exp.location}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              {exp.position}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              {exp.period}
            </p>
            <ul className="space-y-2 text-left">
              {exp.responsibilities.map((responsibility, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start"
                >
                  <span className="mr-2 text-red-500 dark:text-red-400">•</span>
                  <span>{responsibility}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Experience;
