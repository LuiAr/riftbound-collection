import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import RulesClient from "./rules-client";

export const metadata: Metadata = { title: "Rules & reference · Riftbound Collection", description: "Quick Riftbound symbols, keywords, turn order and Radiance Pre-Rift rules." };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const user = await requireChatGPTUser("/rules");
  return <RulesClient accountName={user.displayName} signOutPath={chatGPTSignOutPath("/rules")} />;
}
