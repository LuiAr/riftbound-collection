import { getChatGPTUser } from "../../chatgpt-auth";
import { exportCsv } from "../../../lib/collection";
import { getCollection } from "../../../lib/server-collection";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return new Response("Sign in with ChatGPT to export cards.", { status: 401 });
  try {
    const collection = await getCollection(user.userId);
    return new Response(exportCsv(collection.headers, collection.rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="riftbound-collection-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Collection export failed", error);
    return new Response("Collection storage is temporarily unavailable.", { status: 503 });
  }
}
