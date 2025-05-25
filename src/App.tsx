import Project from './components/projects'
import Skill from './components/skills'
import Contact from './components/contact'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-gray-100 font-sans">
      <nav className="sticky top-0 z-50 flex justify-between items-center sm:px-5 md:px-8 py-6 bg-white/70 dark:bg-black/70 backdrop-blur">
        <h1 className="sm:text-lg md:text-xl font-bold">Junaadh</h1>
        <ul className="flex justify-center items-center gap-6 sm:text-xs md:text-sm">
          <li><a href="#projects" className="hover:underline">Projects</a></li>
          <li><a href="#skills" className="hover:underline">Skills</a></li>
          <li><a href="#contact" className="hover:underline">Contact</a></li>
        </ul>
      </nav>

      <section className="text-center py-16 px-4">
          <img src="/memoji.png" alt="Memoji" className="z-1 w-48 h-48 mx-auto mb-4 rounded-full" />
        <h2 className="text-2xl font-semibold mb-2">About Me</h2>
        <p className="max-w-xl mx-auto text-sm text-gray-600 dark:text-gray-400">
          I’m <strong>Junaadh</strong> — a Computer Science student focused on Cybersecurity,
          systems programming, and embedded programming. 
          I enjoy building tools close to hardware: from assembly programs to interpreters, compilers and analyzers.
        </p>
      </section>

      <Project />
      <Skill />
      <Contact />
    </div>
  )
}

export default App
