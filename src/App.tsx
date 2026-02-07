import Experience from './components/experience'
import Project from './components/projects'
import Skill from './components/skills'
import Contact from './components/contact'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-gray-100 font-sans pb-0">
      {/* Frosted glass navigation */}
      <nav className="fixed bottom-4 left-4 right-4 sm:sticky sm:top-4 sm:left-auto sm:right-auto sm:mx-auto sm:max-w-4xl z-50 rounded-2xl sm:rounded-3xl flex justify-between items-center py-3 px-4 sm:py-4 sm:px-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl shadow-xl border border-white/30 dark:border-white/20 transition-all duration-300">
        <h1 className="text-xl sm:text-2xl font-bold">Junaadh</h1>
        <ul className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <li><a href="#experience" className="hover:underline">Experience</a></li>
          <li><a href="#projects" className="hover:underline">Projects</a></li>
          <li><a href="#skills" className="hover:underline">Skills</a></li>
          <li><a href="#contact" className="hover:underline">Contact</a></li>
        </ul>
      </nav>

      <section className="text-center py-16 px-4">
        <img src="/memoji.png" alt="Memoji" className="z-1 w-48 h-48 mx-auto mb-4 rounded-full" />
        <h2 className="text-2xl font-semibold mb-2">About Me</h2>
        <p className="max-w-xl mx-auto text-sm text-gray-600 dark:text-gray-400">
          Software engineer with experience in systems and application development. Skilled in Rust, Swift, C/C++, and JavaScript frameworks, with experience building low-level infrastructure and user-facing applications across iOS, macOS, and web.
        </p>
      </section>

      <Experience />
      <Project />
      <Skill />
      <Contact />

      {/* Footer */}
      <footer className="text-center py-6 px-4 text-xs text-gray-500 dark:text-gray-400">
        © 2026 Junaadh. All rights reserved.
      </footer>
    </div>
  )
}

export default App
