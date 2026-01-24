type ContactEntry = {
  icon: string,
  label: string,
  url: string,
};

const contact_list: ContactEntry[] = [
  {
    icon: "/icons/github.svg",
    label: "Github",
    url: "https://github.com/junaadh",
  },
  {
    icon: "/icons/mail.svg",
    label: "Email",
    url: "mailto:junaadh.02@gmail.com",
  },
  {
    icon: "/icons/x.svg",
    label: "X",
    url: "https://x.com/junaadh",
  },
];

const Contact = () => {
  return (
    <section id="contact" className="px-4 py-16">
      <h2 className="text-2xl font-semibold mb-12 text-center tracking-tight">
        Get in Touch
      </h2>
      <div className="max-w-sm mx-auto flex justify-center gap-4 text-sm text-gray-700 dark:text-gray-300">
        {contact_list.map((entry) => (
          <a
            key={entry.label}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center items-center gap-3 px-4 py-4 rounded-full transition-colors border border-transparent bg-white hover:bg-gray-200 dark:bg-black dark:hover:bg-gray-800"
          >
            <img
              src={entry.icon}
              alt={`${entry.label} icon`}
              className="w-5 h-5 opacity-80 invert dark:invert-0"
            />
          </a>
        ))}
      </div>
      <div className="max-w-sm mx-auto mt-12 flex justify-center">
        <a
          href="/cv.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors border border-gray-300 dark:border-gray-800 bg-white hover:bg-gray-200 dark:bg-black dark:hover:bg-gray-800 hover:border-red-300 dark:hover:border-red-600 text-gray-800 dark:text-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download CV
        </a>
      </div>
    </section>
  );
}

export default Contact;
