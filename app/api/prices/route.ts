import { getChatGPTUser } from "../../chatgpt-auth";
import { loadPrices } from "../../../lib/server-prices";

export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to see prices." }, { status: 401 });
  try {
    const snapshot = await loadPrices();
    return Response.json(snapshot, { headers: { "cache-control": "private, max-age=3600" } });
  } catch (error) {
    console.error("Cardmarket prices could not be loaded", error);
    return Response.json({ error: "Recent prices are temporarily unavailable." }, { status: 503 });
  }
}
