// Run before CSS/React so stored and system preferences apply on first paint.
(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const valid = (value) => ["auto", "light", "dark"].includes(value);
  let preference = "auto";
  try {
    const saved = localStorage.getItem("portfolio-theme");
    if (valid(saved)) preference = saved;
  } catch {
    /* Storage may be unavailable. */
  }
  function apply() {
    const theme =
      preference === "auto" ? (media.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#171916" : "#e9e7df");
    window.dispatchEvent(new Event("portfolio-theme-applied"));
  }
  window.addEventListener("portfolio-theme-change", (event) => {
    if (!valid(event.detail)) return;
    preference = event.detail;
    try {
      localStorage.setItem("portfolio-theme", preference);
    } catch {
      /* Keep the in-memory setting. */
    }
    apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== "portfolio-theme" && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : "auto";
    apply();
  });
  media.addEventListener("change", () => {
    if (preference === "auto") apply();
  });
  apply();
})();
