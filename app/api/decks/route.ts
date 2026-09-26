import { getChatGPTUser } from "../../chatgpt-auth";
import { deleteDeck, listSavedDecks, saveDeck } from "../../../lib/server-decks";

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to view saved decks." }, { status: 401 });
  try {
    return Response.json({ decks: await listSavedDecks(user.userId) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Saved decks could not be loaded", error);
    return Response.json({ error: "Saved decks are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to save decks." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 25_000) throw new Error("This deck is too large.");
    const raw = await request.text();
    if (raw.length > 25_000) throw new Error("This deck is too large.");
    const body = JSON.parse(raw) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid deck request.");
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) throw new Error("Enter a deck name of up to 80 characters.");
    if (typeof body.deckText !== "string" || !body.deckText.trim() || body.deckText.length > 20_000) throw new Error("Paste a deck list of up to 20,000 characters.");
    if (typeof body.hideRunes !== "boolean" || typeof body.hideTokens !== "boolean") throw new Error("Invalid deck options.");
    if (body.deckId !== undefined && (typeof body.deckId !== "string" || body.deckId.length > 120)) throw new Error("Invalid saved deck.");
    const deck = await saveDeck(user.userId, { deckId: body.deckId as string | undefined, name: body.name.trim(), deckText: body.deckText.trim(), hideRunes: body.hideRunes, hideTokens: body.hideTokens });
    if (!deck) return Response.json({ error: "Saved deck not found." }, { status: 404 });
    return Response.json({ deck }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The deck could not be saved.";
    if (/storage|database|d1|sqlite/i.test(message)) {
      console.error("Saved deck write failed", error);
      return Response.json({ error: "Deck storage is temporarily unavailable." }, { status: 503 });
    }
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to delete decks." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const deckId = new URL(request.url).searchParams.get("deckId");
  if (!deckId || deckId.length > 120) return Response.json({ error: "Invalid saved deck." }, { status: 400 });
  try {
    if (!await deleteDeck(user.userId, deckId)) return Response.json({ error: "Saved deck not found." }, { status: 404 });
    return Response.json({ deleted: true }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Saved deck deletion failed", error);
    return Response.json({ error: "Deck storage is temporarily unavailable." }, { status: 503 });
  }
}
