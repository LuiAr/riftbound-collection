import { getChatGPTUser } from "../../chatgpt-auth";
import { compareInventories, parseCardNexusCsv } from "../../../lib/collection";
import { getCollection, replaceCollection } from "../../../lib/server-collection";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to import cards." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 2_000_000) throw new Error("This CSV is too large (2 MB maximum).");
    const body = await request.text();
    if (body.length > 2_000_000) throw new Error("This CSV is too large (2 MB maximum).");
    const payload = JSON.parse(body) as { csv?: string; mode?: string; version?: number; filename?: string };
    if (typeof payload.csv !== "string") throw new Error("Choose a Card Nexus CSV file.");
    const parsed = parseCardNexusCsv(payload.csv);
    const current = await getCollection(user.userId);
    const difference = compareInventories(current.rows, parsed.rows);
    if (payload.mode === "preview") return Response.json({ difference, version: current.version });
    if (payload.mode !== "apply" || !Number.isInteger(payload.version)) throw new Error("Invalid import request.");
    if (payload.version !== current.version) return Response.json({ error: "Your collection changed. Review this file again before importing." }, { status: 409 });
    const filename = (payload.filename ?? "Card Nexus export").slice(0, 120);
    const updated = await replaceCollection(user.userId, parsed.rows, parsed.headers, current.version, filename);
    if (!updated) return Response.json({ error: "Your collection changed. Review this file again before importing." }, { status: 409 });
    return Response.json({ snapshot: updated, difference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The import could not be read.";
    if (/storage|database|d1|sqlite/i.test(message)) {
      console.error("Collection import failed", error);
      return Response.json({ error: "Collection storage is temporarily unavailable. Try again." }, { status: 503 });
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
