import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { env } from "../tests/fixtures/builder-env";
import { RULES, references, type BuilderInput, type DeckProposal } from "../lib/deck-builder";
import { builderStatus, evaluateBuild, generateDecks } from "../lib/server-builder";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync("drizzle/0003_ancient_lilith.sql", "utf8"));
class Statement {
  values: (string | number | null)[] = [];
  constructor(readonly sql: string) {}
  bind(...values: (string | number | null)[]) { this.values = values; return this; }
  async run() { const r = sqlite.prepare(this.sql).run(...this.values); return { meta: { changes: Number(r.changes) }, success: true }; }
  async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.values) }; }
}
env.DB = { prepare: (sql: string) => new Statement(sql), batch: async (statements: Statement[]) => { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (e) { sqlite.exec("ROLLBACK"); throw e; } } } as unknown as D1Database;
const ref = references[0];
const deck: DeckProposal = { name: "Validated fixture", strategy: ref.strategy, summary: "Fixture strategy", entries: ref.entries, referenceIds: [ref.id], replacements: [], limitations: [] };
const input: BuilderInput = { mode: "competitive", legendId: ref.legendId, favouriteIds: [], budgetSek: 1000, extras: {} };
const fullOwned = Object.fromEntries(ref.entries.map((e) => [e.cardId, 20]));
const fx = { date: "2026-10-02", eurSek: 11.29, usdSek: 10 };
let providerCalls = 0;
let proposal = { ownedOnly: deck, budget: deck, explanation: "Fixture comparison" };
let uncertain = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request) => {
  if (String(url) === RULES.source) return new Response(`<h2>Constructed Format Legality</h2>September 18, 2026<ul>${RULES.bans.map((name) => `<li>${name}</li>`).join("")}</ul><h2>2v2 Constructed Legality</h2><a href="${RULES.core}">Core</a><a href="${RULES.tournament}">Tournament</a>`);
  assert.equal(String(url), "https://api.openai.com/v1/responses");
  providerCalls += 1;
  if (uncertain) throw new Error("Simulated transport failure");
  return Response.json({ status: "completed", usage: { input_tokens: 1000, output_tokens: 100 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(proposal) }] }] });
}) as typeof fetch;
try {
  await assert.rejects(generateDecks("no-key", input, fullOwned, null, fx), /not connected/);
  assert.equal(providerCalls, 0);
  env.OPENAI_API_KEY = "local-test-placeholder";
  const stages: string[] = [];
  const valid = await generateDecks("owner", input, fullOwned, null, fx, (stage) => stages.push(stage));
  assert.deepEqual(stages, ["references", "build", "validate"]);
  assert.ok(valid.ownedOnly);
  assert.ok(valid.budget);
  const longProse = { ...deck, strategy: "s".repeat(150), summary: "x".repeat(6000) };
  const raw = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ ownedOnly: longProse, budget: null, explanation: "x".repeat(6000) }) }] }] };
  const context = { input, owned: fullOwned, prices: null, fx, rulesCheckedAt: new Date().toISOString(), referenceIds: [ref.id] };
  const recovered = evaluateBuild(raw, context, 20);
  assert.deepEqual(recovered.ownedOnly?.entries, deck.entries);
  assert.equal(recovered.ownedOnly?.summary.length, 2500);
  assert.equal(recovered.ownedOnly?.strategy.length, 120);
  assert.equal(recovered.explanation.length, 2500);
  const illegal = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ ownedOnly: { ...longProse, entries: deck.entries.filter((e) => e.section !== "runes") }, budget: null, explanation: "test" }) }] }] };
  assert.equal(evaluateBuild(illegal, context, 20).ownedOnly, null);
  let status = await builderStatus("owner");
  assert.equal(status.reservedSek, 0);
  assert.ok(status.spentSek > 0);
  assert.equal(status.history.length, 1);
  assert.equal((await builderStatus("another-user")).history.length, 0);
  const invalid = await generateDecks("owner", input, {}, null, fx);
  assert.equal(invalid.ownedOnly, null);
  assert.equal(invalid.budget, null);
  assert.ok(invalid.rejected.length === 2);
  const month = new Date().toISOString().slice(0, 7);
  sqlite.prepare("INSERT INTO builder_usage (user_id, month, reserved_ore, spent_ore) VALUES (?, ?, 0, 10000)").run("capped", month);
  const before = providerCalls;
  await assert.rejects(generateDecks("capped", input, fullOwned, null, fx), /monthly AI limit/);
  assert.equal(providerCalls, before);
  uncertain = true;
  const failedStages: string[] = [];
  await assert.rejects(generateDecks("uncertain", input, fullOwned, null, fx, (stage) => failedStages.push(stage)), /transport/);
  assert.deepEqual(failedStages, ["references", "build"], "No validation stage is reported when the provider request fails.");
  status = await builderStatus("uncertain");
  assert.ok(status.reservedSek > 0);
  assert.equal(status.spentSek, 0);
  assert.equal(status.history.length, 0);
  console.log("Server checks passed: secure setup gate, output validation, user isolation, atomic monthly cap, measured charges and uncertain reservations.");
} finally { globalThis.fetch = originalFetch; sqlite.close(); }
