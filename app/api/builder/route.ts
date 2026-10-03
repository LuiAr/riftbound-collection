import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { cardsById, type BuilderInput } from "../../../lib/deck-builder";
import { builderStatus, loadFx, verifyCurrentRules } from "../../../lib/server-builder";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import { deleteBuilderJob, keepBuilderJob, listBuilderJobs, startBuilderJob } from "../../../lib/server-builder-jobs";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to use the deck builder." }, { status: 401 });
  try {
    const [status, fx, rules, inbox] = await Promise.allSettled([builderStatus(user.userId), loadFx(), verifyCurrentRules(), listBuilderJobs(user.userId, new URL(request.url).searchParams.get("before") ?? undefined)]);
    if (status.status !== "fulfilled" || inbox.status !== "fulfilled") throw new Error("Deck builder storage is unavailable.");
    return Response.json({ ...status.value, ...inbox.value, fx: fx.status === "fulfilled" ? fx.value : null, fxError: fx.status === "rejected" ? "Recent SEK exchange rates are unavailable." : null, rulesCheckedAt: rules.status === "fulfilled" ? rules.value : null, rulesError: rules.status === "rejected" ? String(rules.reason.message) : null }, { headers: { "cache-control": "private, no-store" } });
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
    const id = request.headers.get("idempotency-key") ?? crypto.randomUUID();
    if (!/^[a-zA-Z0-9-]{16,120}$/.test(id)) throw new Error("Invalid generation identifier.");
    const operation = startBuilderJob(user.userId, id, input);
    getRequestExecutionContext()?.waitUntil(operation);
    return Response.json({ job: await operation }, { status: 202, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Check the deck builder options and quantities." : error instanceof Error ? error.message : "This build could not be completed.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to keep a generated deck." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw new Error("This request is too large.");
    const body = z.object({ id: z.string().min(1).max(120), version: z.enum(["ownedOnly", "budget"]), name: z.string().trim().min(1).max(80) }).strict().parse(JSON.parse(raw));
    return Response.json({ deck: await keepBuilderJob(user.userId, body.id, body.version, body.name) });
  } catch (error) { return Response.json({ error: error instanceof z.ZodError ? "Check the deck name." : error instanceof Error ? error.message : "The deck could not be kept." }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to delete a generation." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 120) return Response.json({ error: "Invalid generation." }, { status: 400 });
  try {
    if (!await deleteBuilderJob(user.userId, id)) return Response.json({ error: "Generation not found." }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Generation could not be deleted." }, { status: 400 }); }
}
