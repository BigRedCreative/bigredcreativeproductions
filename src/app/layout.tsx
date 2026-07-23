import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: siteConfig.metaTitle,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.ogDescription,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}