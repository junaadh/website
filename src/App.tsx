import { useEffect, useState } from 'react'
import Experience from './components/experience'
import Education from './components/education'
import Project from './components/projects'
import Skill from './components/skills'
import Languages from './components/languages'
import Contact from './components/contact'
import './App.css'

type NavItem = { href: string; label: string }

const NAV_ITEMS: NavItem[] = [
  { href: '#education', label: 'Education' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#skills', label: 'Skills' },
  { href: '#languages', label: 'Languages' },
  { href: '#contact', label: 'Contact' },
]

function App() {
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applySystemTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    }

    applySystemTheme(mediaQuery.matches)

    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches)
    }

    mediaQuery.addEventListener('change', onSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', onSystemThemeChange)
  }, [])

  useEffect(() => {
    if (!isNavOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNavOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isNavOpen])

  const toggleNav = () => {
    setIsNavOpen((prevOpen) => !prevOpen)
  }

  const closeNav = () => {
    setIsNavOpen(false)
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--surface)] focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--fg)] font-sans pb-8">
        <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--border)]">
          <nav className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-4 sm:py-4" aria-label="Main navigation">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight">Moosa Junad</h1>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={toggleNav}
                  aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-controls="main-nav-links"
                  aria-expanded={isNavOpen}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 dark:border-gray-800 bg-white dark:bg-black text-gray-800 dark:text-gray-100 px-4 text-sm font-medium hover:border-red-300 dark:hover:border-red-600 transition-colors"
                >
                  {isNavOpen ? 'Close' : 'Menu'}
                </button>
              </div>
            </div>
            <ul
              id="main-nav-links"
              className={`mt-3 gap-2 text-xs sm:text-sm ${isNavOpen ? 'grid grid-cols-2 sm:grid-cols-3' : 'hidden'}`}
            >
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={closeNav}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-black text-gray-800 dark:text-gray-100 px-2 hover:border-red-300 dark:hover:border-red-600 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main id="main-content">
          <section className="text-center py-16 px-4">
            <img
              src="/memoji.png"
              alt="Memoji avatar of Moosa Junad"
              width={192}
              height={192}
              className="w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-4 rounded-full"
            />
            <h2 className="text-2xl font-semibold mb-2">Moosa Junad</h2>
            <p className="max-w-xl mx-auto text-sm mb-2 text-gray-500 dark:text-gray-400">
              Addu City, Maldives
            </p>
            <p className="max-w-[65ch] mx-auto text-sm text-gray-600 dark:text-gray-400">
              Software engineer with experience in systems and application development. Skilled in Rust, Swift, C/C++, and JavaScript frameworks, with experience building low-level infrastructure and user-facing applications across iOS, macOS, and web.
            </p>
          </section>

          <Education />
          <Experience />
          <Project />
          <Skill />
          <Languages />
          <Contact />
        </main>

        <footer className="text-center py-6 px-4 text-xs text-gray-500 dark:text-gray-400">
          © 2026 Moosa Junad. All rights reserved.
        </footer>
      </div>
    </>
  )
}

export default App
