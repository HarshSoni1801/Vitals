import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitals — performance-critical metrics dashboard",
  description:
    "A real-time system metrics dashboard built to demonstrate 60fps rendering, React concurrent features, and hand-rolled canvas charts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
