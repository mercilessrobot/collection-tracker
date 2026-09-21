import { useEffect } from "react";

// Freeze background page scrolling while a modal/overlay is mounted, so the
// page doesn't drift behind it on iOS. Nested overlays restore correctly
// because each captures and restores the previous overflow value.
export function useLockBodyScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}
