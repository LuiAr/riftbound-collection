import { getChatGPTUser } from "../../chatgpt-auth";
import { getCollectionAt, getCollectionHistory } from "../../../lib/server-collection";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to view your collection history." }, { status: 401 });
  try {
    const importId = new URL(request.url).searchParams.get("importId");
    if (!importId) return Response.json({ history: await getCollectionHistory(user.userId) }, { headers: { "cache-control": "private, no-store" } });
    if (importId.length > 120) return Response.json({ error: "Invalid collection version." }, { status: 400 });
    const snapshot = await getCollectionAt(user.userId, importId);
    if (!snapshot) return Response.json({ error: "Collection version not found." }, { status: 404 });
    return Response.json({ snapshot }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Collection history failed", error);
    return Response.json({ error: "Collection history is temporarily unavailable." }, { status: 503 });
  }
}
