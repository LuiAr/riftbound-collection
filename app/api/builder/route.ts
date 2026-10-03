import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getCollection } from "../../../lib/server-collection";
import { displayCards } from "../../../lib/collection";
import { cardsById, ownedInventory, type BuilderInput } from "../../../lib/deck-builder";
import { builderStatus, generateDecks, loadFx, verifyCurrentRules } from "../../../lib/server-builder";
import { loadPrices } from "../../../lib/server-prices";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to use the deck builder." }, { status: 401 });
  try {
    const [status, fx, rules] = await Promise.allSettled([builderStatus(user.userId), loadFx(), verifyCurrentRules()]);
    if (status.status !== "fulfilled") throw new Error("Deck builder storage is unavailable.");
    return Response.json({ ...status.value, fx: fx.status === "fulfilled" ? fx.value : null, fxError: fx.status === "rejected" ? "Recent SEK exchange rates are unavailable." : null, rulesCheckedAt: rules.status === "fulfilled" ? rules.value : null, rulesError: rules.status === "rejected" ? String(rules.reason.message) : null }, { headers: { "cache-control": "private, no-store" } });
  } catch { return Response.json({ error: "Deck builder storage is temporarily unavailable." }, { status: 503 }); }
}
const schema = z.object({ mode: z.enum(["competitive", "fun"]), legendId: z.string().max(100), favouriteIds: z.array(z.string().max(100)).max(5), budgetSek: z.number().finite().min(0).max(100000), extras: z.record(z.number().int().min(0).max(1000)).refine((x) => Object.keys(x).length <= 100) }).strict();
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to build a deck." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20000) throw new Error("This request is too large.");
    const raw = await request.text();
    if (raw.length > 20000) throw new Error("This request is too large.");
    const input = schema.parse(JSON.parse(raw)) as BuilderInput;
    if (cardsById.get(input.legendId)?.type !== "Legend") throw new Error("Choose a supported Legend.");
    if (input.favouriteIds.some((id) => !cardsById.has(id)) || Object.keys(input.extras).some((id) => !cardsById.has(id))) throw new Error("Unknown favourite or temporary inventory card.");
    if (input.mode === "fun" && !input.favouriteIds.length) throw new Error("Choose a favourite card for the fun deck.");
    const [snapshot, prices, fx] = await Promise.all([getCollection(user.userId), loadPrices().catch(() => null), loadFx()]);
    const owned = ownedInventory(displayCards(snapshot.rows), input.extras);
    if (input.favouriteIds.some((id) => !owned[id])) throw new Error("Confirm that you own your favourite cards using a temporary addition first.");
    return Response.json(await generateDecks(user.userId, input, owned, prices, fx), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Check the deck builder options and quantities." : error instanceof Error ? error.message : "This build could not be completed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
