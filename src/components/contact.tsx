type ContactEntry = {
  icon: string,
  label: string,
  url: string,
};

const contact_list: [ContactEntry] = [
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
    </section>
  );
}

export default Contact;
