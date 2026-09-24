import { useEffect, useRef, useState } from "react";

type PermDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

// Drives a subtle light-sheen on cards from the device's tilt. Sets --tiltx /
// --tilty (each -1..1) on <html>; the CSS gradient reads them. iOS 13+ needs
// motion permission, which must be requested from a user gesture (the toggle).
export function useTiltShine() {
  const [enabled, setEnabled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const latest = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("tilt-shine");

    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left/right tilt, ~-90..90
      const beta = e.beta ?? 0; // front/back tilt, ~-180..180
      latest.current = {
        x: Math.max(-1, Math.min(1, gamma / 40)),
        y: Math.max(-1, Math.min(1, (beta - 45) / 40)), // 45° ≈ natural hold
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const el = document.documentElement;
          el.style.setProperty("--tiltx", latest.current.x.toFixed(3));
          el.style.setProperty("--tilty", latest.current.y.toFixed(3));
        });
      }
    };

    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      document.body.classList.remove("tilt-shine");
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      document.documentElement.style.removeProperty("--tiltx");
      document.documentElement.style.removeProperty("--tilty");
    };
  }, [enabled]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      return;
    }
    const DOE = window.DeviceOrientationEvent as PermDOE | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        if ((await DOE.requestPermission()) !== "granted") return;
      } catch {
        return;
      }
    }
    setEnabled(true);
  }

  const supported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  return { enabled, toggle, supported };
}
