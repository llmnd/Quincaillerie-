"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public-site] runtime error", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f7f9fc",
        color: "#0b1220",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
        >
          <AlertCircle size={24} />
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Impossible de charger cette page
        </h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 15 }}>
          Une erreur est survenue lors du chargement du site. Réessayez ou
          revenez plus tard.
        </p>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            padding: "0 20px",
            border: 0,
            borderRadius: 12,
            background: "#0f766e",
            color: "#fff",
            font: "inherit",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RotateCw size={15} /> Réessayer
        </button>
      </div>
    </div>
  );
}