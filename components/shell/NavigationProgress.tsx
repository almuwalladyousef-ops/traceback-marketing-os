"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() { timers.current.forEach(clearTimeout); timers.current = []; }

  function play() {
    clear();
    setVisible(true);
    setFinishing(false);
    timers.current.push(setTimeout(() => setFinishing(true), 600));
    timers.current.push(setTimeout(() => setVisible(false), 1000));
  }

  // Fire on hard-load mount and on every route change
  useEffect(() => { play(); return clear; }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      height: 2,
      zIndex: 9999,
      background: "var(--accent)",
      boxShadow: "0 0 10px var(--accent), 0 0 4px var(--accent)",
      pointerEvents: "none",
      animation: finishing
        ? "nav-finish 0.4s ease-out forwards"
        : "nav-progress 1.5s ease-out forwards",
    }}/>
  );
}
