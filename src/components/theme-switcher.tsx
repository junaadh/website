import { useEffect, useState } from "react";
type Preference = "auto" | "light" | "dark";
const readPreference = () =>
  (document.documentElement.dataset.themePreference || "auto") as Preference;
export default function ThemeSwitcher() {
  const [preference, setPreference] = useState<Preference>(readPreference);
  useEffect(() => {
    const sync = () => setPreference(readPreference());
    window.addEventListener("portfolio-theme-applied", sync);
    return () => window.removeEventListener("portfolio-theme-applied", sync);
  }, []);
  return (
    <div className="theme-switcher" role="group" aria-label="Color theme">
      {(["auto", "light", "dark"] as const).map((theme) => (
        <button
          type="button"
          key={theme}
          aria-pressed={preference === theme}
          title={
            theme === "auto" ? "Follow your system theme" : `Use ${theme} theme`
          }
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("portfolio-theme-change", { detail: theme }),
            )
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            {theme === "auto" ? (
              <>
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </>
            ) : theme === "light" ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
              </>
            ) : (
              <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />
            )}
          </svg>
          <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
        </button>
      ))}
    </div>
  );
}
