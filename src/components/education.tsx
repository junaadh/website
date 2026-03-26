type EducationData = {
  institution: string;
  location: string;
  period: string;
  qualification: string;
  details: string;
};

const educationItems: EducationData[] = [
  {
    institution: "Taylor's University",
    location: "Subang Jaya, Malaysia",
    period: "January 2023 - January 2026",
    qualification: "Bachelor of Computer Science (Honors)",
    details: "Major in Cyber Security; Extension in Artificial Intelligence; CGPA: 3.42",
  },
  {
    institution: "Addu High School",
    location: "Addu City, Maldives",
    period: "February 2019 - November 2021",
    qualification: "Pearson Edexcel A'level; GCE English & HSC; Science",
    details: "",
  },
  {
    institution: "Sharafuddin School",
    location: "Addu City, Maldives",
    period: "January 2016 - November 2018",
    qualification: "Cambridge GCE O'level; IGCSE English & SSC; Science",
    details: "",
  },
];

const Education = () => {
  return (
    <section id="education" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-10 text-center tracking-tight">
        Education
      </h2>
      <div className="max-w-3xl mx-auto space-y-6">
        {educationItems.map((item) => (
          <article
            key={item.institution}
            className="rounded-lg border bg-white dark:bg-black p-6 transition border-gray-300 dark:border-gray-800 text-left"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {item.institution}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {item.location}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
              {item.period}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              {item.qualification}
            </p>
            {item.details && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {item.details}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default Education;
