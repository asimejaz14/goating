import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";

import { AppFrame } from "@/components/layout/AppFrame";
import { THEME_SCRIPT } from "@/components/providers/ThemeProvider";

import "./globals.css";
import { Providers } from "./providers";

// Inter at a tight tracking is the plainest, most legible thing available —
// the design carries no personality of its own so the data can.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Goat Farm Portal",
  description:
    "Herd records, crossings and kidding, an auto-building pedigree, and the shared farm ledger.",
  applicationName: "Goat Farm Portal",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFCFD" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E11" },
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available — clamping it would fail an accessibility audit.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` covers the class the theme script writes onto
    // <html> before React boots — the mismatch is the whole point of it.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so the correct theme is never a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {/* useSearchParams (in the filter hooks) needs a Suspense boundary. */}
        <Suspense>
          <Providers>
            <AppFrame>{children}</AppFrame>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
