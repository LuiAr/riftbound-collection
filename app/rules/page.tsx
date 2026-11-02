import type { Metadata } from "next";
import RulesClient from "./rules-client";

export const metadata: Metadata = { title: "Rules & reference · Riftbound Collection", description: "Quick Riftbound symbols, keywords, turn order and Radiance Pre-Rift rules." };

export default function RulesPage() {
  return <RulesClient />;
}
