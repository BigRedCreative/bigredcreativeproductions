import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Red Creative Productions",
  description:
    "Branding, design, print, promotions, and event management for bold businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}