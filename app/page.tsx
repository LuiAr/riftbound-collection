import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { getCollection } from "../lib/server-collection";
import CollectionClient from "./collection-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  try {
    const snapshot = await getCollection(user.userId);
    return <CollectionClient initial={snapshot} accountName={user.displayName} signOutPath={chatGPTSignOutPath("/")} />;
  } catch (error) {
    console.error("Collection load failed", error);
    return <main className="unavailable"><h1>Collection unavailable</h1><p>Your saved cards could not be loaded right now. Try refreshing this page.</p></main>;
  }
}
