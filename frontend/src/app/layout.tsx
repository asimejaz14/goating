import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Suspense } from "react";

import { AppFrame } from "@/components/layout/AppFrame";

import "./globals.css";
import { Providers } from "./providers";

// Rounded, friendly, and highly legible at small sizes — it suits both the
// soft-UI look and reading a tag number in the sun.
const nunito = Nunito({
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
  themeColor: "#F8F3E9",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available — clamping it would fail an accessibility audit.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
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
