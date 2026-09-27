import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riftbound Collection",
  description: "Your Riftbound card collection, synced across devices.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Chakra+Petch:wght@500;600;700&family=Figtree:wght@400;500;600;700&display=swap" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
