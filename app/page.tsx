import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { getCollection, getCollectionHistory, type CollectionSnapshot, type CollectionVersion } from "../lib/server-collection";
import CollectionClient from "./collection-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  let data: { snapshot: CollectionSnapshot; history: CollectionVersion[] } | null = null;
  try {
    const snapshot = await getCollection(user.userId);
    const history = await getCollectionHistory(user.userId);
    data = { snapshot, history };
  } catch (error) {
    console.error("Collection load failed", error);
  }
  if (!data) return <main className="unavailable"><h1>Collection unavailable</h1><p>Your saved cards could not be loaded right now. Try refreshing this page.</p></main>;
  return <CollectionClient initial={data.snapshot} initialHistory={data.history} accountName={user.displayName} signOutPath={chatGPTSignOutPath("/")} />;
}
