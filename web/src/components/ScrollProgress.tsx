"use client";

import { useEffect, useState } from "react";

type Props = Readonly<{ color?: string }>;

export default function ScrollProgress({ color = "#14b8a6" }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 3,
        zIndex: 9999,
        width: `${progress}%`,
        background: color,
        transition: "width 80ms linear",
        pointerEvents: "none",
      }}
    />
  );
}