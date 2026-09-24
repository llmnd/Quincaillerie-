"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

type Props = Readonly<{ color?: string; threshold?: number }>;

export default function BackToTop({
  color = "#0f766e",
  threshold = 600,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Retour en haut de la page"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        width: 44,
        height: 44,
        border: 0,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible ? "auto" : "none",
        boxShadow: "0 12px 28px -10px rgba(0,0,0,.4)",
        transition: "opacity 220ms ease, transform 220ms ease",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}