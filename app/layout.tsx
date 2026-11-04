import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import "./atlas.css";
import "./binder.css";
import "./rules/rules.css";
import "./ledger.css";
import { sitePath } from "../lib/site-path";

export const metadata: Metadata = {
  title: "Riftbound Collection",
  description: "A Riftbound card collection with prices, goals, deck lists and history.",
  icons: {
    icon: sitePath("/icon-64.png"),
    apple: sitePath("/apple-touch-icon.png"),
  },
};

export const viewport: Viewport = {
  themeColor: "#fcfcfd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ "--missing-art": `url(${sitePath("/riftbound-logo-96.png")})` } as CSSProperties}>{children}</body>
    </html>
  );
}
