import type { Metadata, Viewport } from "next";
import "@fontsource-variable/figtree";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "Riftbound Collection",
  description: "Build, save and improve Riftbound decks with the cards you own.",
  icons: {
    icon: "/icon-64.png",
    apple: "/apple-touch-icon.png",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
