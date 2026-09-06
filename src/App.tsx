import { useState } from "react";
import profile from "./data/profile.json";
import "./App.css";
import ThemeSwitcher from "./components/theme-switcher";
import Accordion from "./components/accordion";

const filters = ["All work", "Systems", "Full stack", "Native"];
const arrow = <span aria-hidden="true">↗</span>;
// Bypass copies stored under the previous one-year immutable cache policy.
const cvUrl = "/cv.pdf?v=typst-1";

function ByteInspector() {
  const [value, setValue] = useState("hello, world");
  const [format, setFormat] = useState<"hex" | "binary">("hex");
  const bytes = Array.from(new TextEncoder().encode(value));
  return (
    <div className="inspector">
      <div className="inspector-top">
        <span>
          <i /> MEMORY VIEW
        </span>
        <span>UTF-8 / {format === "hex" ? "BASE 16" : "BASE 2"}</span>
      </div>
      <div className="inspector-input">
        <label htmlFor="memory-input">&gt; write</label>
        <input
          id="memory-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          spellCheck={false}
          autoComplete="off"
          aria-describedby="memory-hint"
        />
      </div>
      <div className="memory-grid" aria-label={`${bytes.length} UTF-8 bytes`}>
        {Array.from(
          { length: Math.max(16, Math.ceil(bytes.length / 8) * 8) },
          (_, index) => (
            <div
              className={`memory-cell ${bytes[index] !== undefined ? "filled" : ""}`}
              key={index}
            >
              <span>{index.toString(16).padStart(2, "0")}</span>
              <b className={format}>
                {bytes[index] === undefined
                  ? "··"
                  : bytes[index]
                      .toString(format === "hex" ? 16 : 2)
                      .padStart(format === "hex" ? 2 : 8, "0")}
              </b>
            </div>
          ),
        )}
      </div>
      <div className="inspector-bottom">
        <span id="memory-hint">Type something. See the bytes.</span>
        <div className="format-switch" aria-label="Byte display format">
          {(["hex", "binary"] as const).map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
            >
              {f === "hex" ? "HEX" : "BIN"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectGraphic({ motif }: { motif: string }) {
  if (motif === "compiler")
    return (
      <div className="pipeline" aria-hidden="true">
        <span>
          source<span className="code-mark">{"{ }"}</span>
        </span>
        <i>→</i>
        <span>
          parse<span className="tree-mark">⑂</span>
        </span>
        <i>→</i>
        <span>
          emit<span className="code-mark">01</span>
        </span>
      </div>
    );
  if (motif === "asm")
    return (
      <pre aria-hidden="true">
        <span className="dim">; aarch64 / socket</span>
        {"\n"}
        <em>mov</em> x0, <span>#2</span>
        {"\n"}
        <em>mov</em> x1, <span>#1</span>
        {"\n"}
        <em>svc</em> <span>#0</span>
      </pre>
    );
  if (motif === "auth")
    return (
      <div className="auth-flow" aria-hidden="true">
        <span>identity</span>
        <i>→</i>
        <b>● verified</b>
        <i>→</i>
        <span>session</span>
      </div>
    );
  return (
    <div className="project-wordmark" aria-hidden="true">
      {motif === "commerce"
        ? "bloom light."
        : motif === "requests"
          ? "req → res"
          : motif === "native"
            ? "presence_"
            : ":helix"}
    </div>
  );
}

function App() {
  const [filter, setFilter] = useState("All work");
  const projects = profile.projects.filter(
    (p) => filter === "All work" || p.category === filter,
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="masthead container">
        <a className="brand" href="#" aria-label="Junad, home">
          <img src="/favicon.svg" width="40" height="40" alt="" />
          <span className="brand-name">junaadh</span>
        </a>
        <ThemeSwitcher />
      </div>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-meta">
            <span>
              <i className="status-dot" /> SOFTWARE DEVELOPER
            </span>
            <span>MALDIVES · UTC+05:00</span>
          </div>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">Hi, I'm {profile.commonName}.</p>
              <h1 id="hero-title">
                From the bits.
                <br />
                To the <span>browser.</span>
              </h1>
              <p className="hero-description">
                I’m a developer from the Maldives. I build web apps and backend
                services, and I like getting underneath them to see how things
                actually work.
              </p>
              <div className="hero-actions">
                <a
                  className="button primary transition-[background-color,transform,translate] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-reduce:transition-none"
                  href="#work"
                >
                  A few things I’ve built <span aria-hidden="true">↓</span>
                </a>
                <a
                  className="text-link"
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub {arrow}
                </a>
              </div>
              <div className="current-role">
                <span className="small-cross" aria-hidden="true">
                  +
                </span>{" "}
                Currently building at{" "}
                <a href="#experience">SME Digital {arrow}</a>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-caption">
                <span>A SMALL THING TO PLAY WITH</span>
                <span aria-hidden="true">[ interactive ]</span>
              </div>
              <ByteInspector />
              <div className="visual-footnote">
                <span>A little hello, underneath it all.</span>
                <span aria-hidden="true">↳</span>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <span>
              RUST <i>/</i> C & C++ <i>/</i> TYPESCRIPT <i>/</i> SWIFT
            </span>
            <a href="#work">SCROLL TO EXPLORE ↓</a>
          </div>
        </section>

        <section
          className="work-section container"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / SELECTED WORK</p>
              <h2 id="work-title">
                Things I’ve made.
                <br />
                <span className="dim">And learned along the way.</span>
              </h2>
            </div>
            <a
              className="text-link"
              href={profile.github}
              target="_blank"
              rel="noreferrer"
            >
              All repositories {arrow}
            </a>
          </div>
          <div className="filter-row">
            <div className="filters" aria-label="Filter projects">
              {filters.map((f) => (
                <button
                  type="button"
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === "All work" && (
                    <span>
                      {profile.projects.length.toString().padStart(2, "0")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="result-count" role="status">
              {projects.length} projects
            </span>
          </div>
          <div className="project-grid" key={filter}>
            {projects.map((project) => (
              <a
                className={`project-card transition-[border-color,transform,translate,box-shadow] duration-300 motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1 motion-reduce:transition-none ${project.motif}`}
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="project-art">
                  <span className="project-category">{project.category}</span>
                  <ProjectGraphic motif={project.motif} />
                  <span className="project-open" aria-label="Open project">
                    {arrow}
                  </span>
                </div>
                <div className="project-body">
                  <p className="eyebrow">{project.label}</p>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="tags">
                    {project.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section
          className="experience-section container"
          id="experience"
          aria-labelledby="experience-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / EXPERIENCE</p>
              <h2 id="experience-title">Where I've been building.</h2>
            </div>
          </div>
          <div className="experience-list">
            {profile.experience.map((job, index) => (
              <article
                className={`experience-row ${job.current ? "current" : ""}`}
                key={job.company}
              >
                <div className="experience-date">
                  <span className="job-index">0{index + 1}</span>
                  <span>{job.period}</span>
                  {job.current && (
                    <span className="current-badge">
                      <i className="status-dot" /> CURRENT
                    </span>
                  )}
                </div>
                <div className="experience-info">
                  <p className="job-role">{job.role}</p>
                  <h3>{job.company}</h3>
                  <p>{job.summary}</p>
                  {job.bullets.length > 0 && (
                    <Accordion
                      label="What I worked on"
                      context={job.company}
                      defaultOpen={job.current}
                    >
                      <ul>
                        {job.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </Accordion>
                  )}
                  <div className="tags">
                    {job.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
                <span className="job-location">{job.location}</span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="about-section container"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="personal-note">
            <img
              src={`${profile.github}.png?size=144`}
              alt={`${profile.name}'s GitHub profile picture`}
              width="72"
              height="72"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <span>
              A face to go with the code.
              <br />
              <b>
                Junad <span aria-hidden="true">↴</span>
              </b>
            </span>
          </div>
          <div className="about-intro">
            <div>
              <p className="eyebrow">03 / A LITTLE ABOUT ME</p>
              <h2 id="about-title">
                Curiosity, all the
                <br />
                way down<span className="accent">.</span>
              </h2>
            </div>
            <div>
              <p>{profile.about}</p>
              <p>
                Some projects solve a practical problem. Others start with “I
                wonder how that works.” I like having room for both.
              </p>
            </div>
          </div>
          <div className="skills-grid">
            {profile.skills.map((skill, index) => (
              <article key={skill.name}>
                <span className="skill-number">0{index + 1}</span>
                <h3>{skill.name}</h3>
                <p>{skill.description}</p>
                <ul>
                  {skill.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="education">
            <p className="eyebrow">EDUCATION</p>
            <div>
              <h3>{profile.education[0].institution}</h3>
              <p>{profile.education[0].qualification}</p>
              <p className="dim">{profile.education[0].details}</p>
              <Accordion label="Earlier education">
                {profile.education.slice(1).map((e) => (
                  <div className="earlier-education" key={e.institution}>
                    <h4>{e.institution}</h4>
                    <p>{e.qualification}</p>
                    <p className="dim">{e.period}</p>
                  </div>
                ))}
              </Accordion>
            </div>
            <span className="education-period">
              {profile.education[0].period}
            </span>
          </div>
          <div className="language-row">
            <span>HUMAN LANGUAGES</span>
            <p>{profile.languages.join(" / ")}</p>
          </div>
        </section>

        <section className="contact-section container" id="contact">
          <p className="eyebrow">A PROJECT, A QUESTION, OR JUST A HELLO.</p>
          <div className="contact-heading">
            <h2>
              Let's build
              <br />
              something <span>good.</span>
            </h2>
            <a
              className="contact-arrow"
              href={`mailto:${profile.email}`}
              aria-label={`Email ${profile.name}`}
            >
              {arrow}
            </a>
          </div>
          <div className="contact-links">
            <a href={`mailto:${profile.email}`}>
              {profile.email} {arrow}
            </a>
            <a href={cvUrl} target="_blank" rel="noreferrer">
              Download résumé <span className="pdf-label">PDF</span> ↓
            </a>
          </div>
        </section>
      </main>
      <footer className="container">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <div>
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub {arrow}
          </a>
          <a href="https://x.com/junaadh" target="_blank" rel="noreferrer">
            X {arrow}
          </a>
          <a href="#">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
export default App;
