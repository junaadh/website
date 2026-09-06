import { useEffect } from "react";

/**
 * Reveals anything marked `data-reveal` as it scrolls into view. Progressive
 * enhancement: without IntersectionObserver, or with reduced motion, the
 * attribute is never set to "pending" and content simply stays visible.
 */
export default function useReveal() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = "visible";
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    for (const element of elements) {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.dataset.reveal = "pending";
        observer.observe(element);
      }
    }
    const showAll = () => {
      if (!preference.matches) return;
      observer.disconnect();
      for (const element of elements) element.dataset.reveal = "";
    };
    preference.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", showAll);
      for (const element of elements) element.dataset.reveal = "";
    };
  }, []);
}
