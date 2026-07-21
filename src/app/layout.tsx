import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Red Creative Productions | Branding, Print, Promotions & Events",
  description:
    "Michigan creative production company delivering branding, graphic design, packaging, print production, promotions and event management.",
  metadataBase: new URL("https://bigredcreativeproductions.com"),
  openGraph: {
    title: "Big Red Creative Productions",
    description: "Bold branding, print, promotions and unforgettable events.",
    type: "website",
  },
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