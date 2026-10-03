import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { env } from "../tests/fixtures/builder-env";
import { RULES, references, type BuilderInput, type DeckProposal } from "../lib/deck-builder";
import { builderStatus } from "../lib/server-builder";
import { deleteBuilderJob, getBuilderJob, keepBuilderJob, listBuilderJobs, refreshBuilderJob, startBuilderJob } from "../lib/server-builder-jobs";

const sqlite = new DatabaseSync(":memory:");
for (const name of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(`drizzle/${name}`, "utf8"));
class Statement {
  values: (string | number | null)[] = [];
  constructor(readonly sql: string) {}
  bind(...values: (string | number | null)[]) { this.values = values; return this; }
  execute() { const r = sqlite.prepare(this.sql).run(...this.values); return { meta: { changes: Number(r.changes) }, success: true }; }
  async run() { return this.execute(); }
  async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.values) }; }
}
env.DB = { prepare: (sql: string) => new Statement(sql), batch: async (statements: Statement[]) => { sqlite.exec("BEGIN"); try { const results = statements.map((statement) => statement.execute()); sqlite.exec("COMMIT"); return results; } catch (e) { sqlite.exec("ROLLBACK"); throw e; } } } as unknown as D1Database;
env.OPENAI_API_KEY = "local-test-placeholder";
const ref = references[0];
const deck: DeckProposal = { name: "Background fixture", strategy: ref.strategy, summary: "Fixture strategy", entries: ref.entries, referenceIds: [ref.id], replacements: [], limitations: [] };
const input: BuilderInput = { mode: "competitive", legendId: ref.legendId, favouriteIds: [], budgetSek: 1000, extras: Object.fromEntries(ref.entries.map((entry) => [entry.cardId, 20])) };
let output = JSON.stringify({ ownedOnly: deck, budget: deck, explanation: "Complete fixture" });
let finished = false;
let expired = false;
let acknowledgementLost = false;
let rejected = false;
let submissions = 0;
let conversations = 0;
const deleted: string[] = [];
const originalFetch = globalThis.fetch;
const originalInfo = console.info;
console.info = () => {};
globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
  const target = String(url);
  if (target === RULES.source) return new Response(`<h2>Constructed Format Legality</h2>September 18, 2026<ul>${RULES.bans.map((name) => `<li>${name}</li>`).join("")}</ul><h2>2v2 Constructed Legality</h2><a href="${RULES.core}">Core</a><a href="${RULES.tournament}">Tournament</a>`);
  if (target.includes("frankfurter")) return Response.json({ date: new Date().toISOString().slice(0, 10), rates: { SEK: 11.29, USD: 1.129 } });
  if (!target.startsWith("https://api.openai.com/v1/")) return new Response("Unavailable fixture price guide", { status: 503 });
  const path = target.slice("https://api.openai.com/v1/".length);
  if (options?.method === "DELETE") { deleted.push(path); return Response.json({ deleted: true }); }
  if (path === "conversations" && options?.method === "POST") return Response.json({ id: `conv_${++conversations}` });
  if (path === "responses" && options?.method === "POST") {
    submissions++;
    const body = JSON.parse(String(options.body));
    assert.equal(body.background, true);
    assert.equal(body.store, true);
    assert.ok(body.conversation.startsWith("conv_"));
    if (rejected) return Response.json({ error: { code: "invalid_api_key", message: "Fixture API credentials rejected" } }, { status: 401, headers: { "x-request-id": "req_fixture" } });
    if (acknowledgementLost) throw new Error("Fixture transport disconnected after submission");
    return Response.json({ id: `resp_${submissions}`, status: "queued" });
  }
  if (path.startsWith("responses/")) {
    if (expired) return Response.json({ error: { message: "Expired response fixture" } }, { status: 404 });
    return Response.json({ status: finished ? "completed" : "in_progress", ...(finished ? { usage: { input_tokens: 1000, output_tokens: 100 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: output }] }] } : {}) });
  }
  if (path.includes("/items?")) return Response.json({ has_more: false, data: finished ? [{ id: "msg_fixture", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: output }] }] : [] });
  throw new Error(`Unexpected test request ${path}`);
}) as typeof fetch;
try {
  const id = "background-fixture-1";
  const started = await startBuilderJob("owner", id, input);
  assert.equal(started.status, "queued");
  assert.equal(started.result, null);
  assert.equal(submissions, 1);
  assert.ok(started.logs.some((event) => event.message.includes("You can close")));
  await assert.rejects(deleteBuilderJob("owner", id), /finish/);
  assert.equal(await getBuilderJob("other-user", id), null);
  assert.equal((await listBuilderJobs("other-user")).jobs.length, 0);
  await Promise.all([startBuilderJob("owner", id, input), startBuilderJob("owner", id, input)]);
  assert.equal(submissions, 1);
  assert.ok((await builderStatus("owner")).reservedSek > 0);
  finished = true;
  await Promise.all([refreshBuilderJob("owner", id), refreshBuilderJob("owner", id)]);
  const ready = await getBuilderJob("owner", id);
  assert.equal(ready?.status, "completed");
  assert.ok(ready?.result?.ownedOnly);
  assert.ok(ready.logs.some((event) => event.stage === "validate"));
  const charged = await builderStatus("owner");
  assert.equal(charged.reservedSek, 0);
  assert.equal(charged.spentSek, 0.03);
  await refreshBuilderJob("owner", id);
  assert.equal((await builderStatus("owner")).spentSek, charged.spentSek);
  const kept = await keepBuilderJob("owner", id, "ownedOnly", "Kept fixture");
  const keptAgain = await keepBuilderJob("owner", id, "ownedOnly", "Kept fixture");
  assert.equal(keptAgain.deckId, kept.deckId);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM saved_decks").get()?.total, 1);
  assert.equal((await listBuilderJobs("owner")).jobs.length, 0);
  assert.equal(await deleteBuilderJob("owner", id), true);
  assert.equal(await getBuilderJob("owner", id), null);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM saved_decks").get()?.total, 1);
  assert.ok(deleted.includes("conversations/conv_1/items/msg_fixture"));
  assert.ok(deleted.includes("conversations/conv_1"));
  assert.ok(deleted.includes("responses/resp_1"));
  assert.equal(sqlite.prepare("SELECT raw_output, result_json FROM builder_calls WHERE call_id = ?").get(id)?.raw_output, null);
  assert.equal((await builderStatus("owner")).spentSek, charged.spentSek);

  finished = false;
  const rejectedId = "rejected-proposal-fixture";
  await startBuilderJob("owner", rejectedId, input);
  output = JSON.stringify({ ownedOnly: null, budget: null, explanation: "No coherent strategy fits the selected favourites." });
  finished = true;
  const noDeck = await refreshBuilderJob("owner", rejectedId);
  assert.equal(noDeck?.status, "no_deck");
  assert.ok(noDeck?.rawOutput?.includes("No coherent strategy"));
  assert.ok(noDeck?.result?.explanation.includes("favourites"));
  await assert.rejects(keepBuilderJob("owner", rejectedId, "ownedOnly", "Invalid fixture"), /no validated/);

  finished = false;
  await startBuilderJob("owner", "invalid-output-fixture", input);
  output = "Incomplete JSON fixture";
  finished = true;
  const bad = await refreshBuilderJob("owner", "invalid-output-fixture");
  assert.equal(bad?.status, "failed");
  assert.equal(bad?.rawOutput, output);
  assert.ok(bad?.logs.some((event) => event.message.includes("Output retained")));

  finished = false;
  await startBuilderJob("owner", "expired-response-fixture", input);
  output = JSON.stringify({ ownedOnly: deck, budget: deck, explanation: "Recovered fixture" });
  finished = true; expired = true;
  const recovered = await refreshBuilderJob("owner", "expired-response-fixture");
  assert.equal(recovered?.status, "completed");
  assert.equal(recovered?.result?.costEstimated, true);
  assert.ok((recovered?.result?.costSek ?? 0) > 0.03);
  assert.ok(recovered?.logs.some((event) => event.message.includes("conservative")));
  expired = false;

  finished = false; acknowledgementLost = true;
  const lost = await startBuilderJob("owner", "lost-acknowledgement-fixture", input);
  assert.equal(lost.status, "in_progress");
  const submittedBeforeRecovery = submissions;
  finished = true; acknowledgementLost = false;
  const recoveredAck = await refreshBuilderJob("owner", lost.id);
  assert.equal(recoveredAck?.status, "completed");
  assert.equal(submissions, submittedBeforeRecovery);
  assert.equal((await builderStatus("owner")).reservedSek, 0);

  rejected = true;
  const denied = await startBuilderJob("denied-user", "denied-credentials-fixture", input);
  assert.equal(denied.status, "failed");
  assert.ok(denied.error?.includes("invalid_api_key"));
  assert.ok(denied.error?.includes("req_fixture"));
  assert.equal((await builderStatus("denied-user")).reservedSek, 0);
  assert.equal((await builderStatus("denied-user")).spentSek, 0);
  rejected = false;
  const month = new Date().toISOString().slice(0, 7);
  sqlite.prepare("INSERT INTO builder_usage (user_id, month, reserved_ore, spent_ore) VALUES (?, ?, 0, 10000)").run("capped-user", month);
  const before = submissions;
  const capped = await startBuilderJob("capped-user", "capped-background-fixture", input);
  assert.equal(capped.status, "failed");
  assert.equal(submissions, before);
  console.log("Background job checks passed: durable submission and recovery, account isolation, duplicate-safe billing/keep, retained failures, explicit deletion and monthly cap.");
} finally { globalThis.fetch = originalFetch; console.info = originalInfo; sqlite.close(); }
