import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quincaillerie ERP",
  description: "Tableau de bord ERP pour la gestion des fournisseurs, clients et ventes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const stopZoom = (event) => {
                  if (event.ctrlKey || event.metaKey) event.preventDefault();
                };

                document.addEventListener('wheel', stopZoom, { passive: false });
                document.addEventListener('touchmove', (event) => {
                  if (event.touches && event.touches.length > 1) event.preventDefault();
                }, { passive: false });

                let lastTouchEnd = 0;
                document.addEventListener('touchend', (event) => {
                  const now = Date.now();
                  if (now - lastTouchEnd <= 300) event.preventDefault();
                  lastTouchEnd = now;
                }, { passive: false });
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
