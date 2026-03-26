const languages = ["English", "Dhivehi"];

const Languages = () => {
  return (
    <section id="languages" className="px-4 py-12">
      <h2 className="text-2xl font-semibold mb-8 text-center tracking-tight">
        Languages
      </h2>
      <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-3">
        {languages.map((language) => (
          <span
            key={language}
            className="px-5 py-2 rounded-full border border-gray-300 dark:border-gray-800 bg-white dark:bg-black text-sm text-gray-800 dark:text-gray-100"
          >
            {language}
          </span>
        ))}
      </div>
    </section>
  );
};

export default Languages;
