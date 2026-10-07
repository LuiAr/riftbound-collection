import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { env } from "../tests/fixtures/builder-env";
import { setTestUser } from "../tests/fixtures/advisor-auth";
import initial from "../data/initial-inventory.json";
import { displayCards } from "../lib/collection";
import { assessDeck, builderCards, cardsById, exportDeck, ownedInventory, references, validateDeck, type DeckProposal } from "../lib/deck-builder";
import { analyzeStrategy, cardDataGaps, cardRoles, collectionCandidates, parseAdvisorDeck, rankDeckCandidates, upgradeDeck } from "../lib/deck-advisor";
import { compareRelease, validGalleryCards } from "../lib/card-releases";
import { loadFx, verifyCurrentRules } from "../lib/server-builder";
import { loadPrices } from "../lib/server-prices";
import { deleteDeck, getDeckVersions, saveDeck } from "../lib/server-decks";
import { POST as adviserPOST } from "../app/api/advisor/route";
import { GET as decksGET } from "../app/api/decks/route";

const sqlite = new DatabaseSync(":memory:");
for (const name of readdirSync("drizzle").filter(n => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(`drizzle/${name}`, "utf8"));
class Statement {
  values: (string | number | null)[] = [];
  constructor(readonly sql: string) {}
  bind(...values: (string | number | null)[]) { this.values = values; return this; }
  execute() { const r = sqlite.prepare(this.sql).run(...this.values); return { meta: { changes: Number(r.changes) }, success: true }; }
  async run() { return this.execute(); }
  async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.values) }; }
}
env.DB = { prepare: (sql: string) => new Statement(sql), batch: async (statements: Statement[]) => { sqlite.exec("BEGIN"); try { const results = statements.map(s => s.execute()); sqlite.exec("COMMIT"); return results; } catch (e) { sqlite.exec("ROLLBACK"); throw e; } } } as unknown as D1Database;
const dataDir = process.env.ADVISER_DATA_DIR ?? "tests/fixtures/adviser-captured";
const originalNow = Date.now;
// Replays stay reproducible after the captured prices expire. Production uses the real clock.
Date.now = () => Date.parse("2026-10-07T12:00:00Z");
const inventory = process.env.ADVISER_INVENTORY_PATH ? JSON.parse(readFileSync(process.env.ADVISER_INVENTORY_PATH, "utf8")) as typeof initial & { version: number; sourceName: string } : { ...initial, version: 1, sourceName: "Owner-supplied September 24 inventory" };
const realOwned = ownedInventory(displayCards(inventory.rows));
const captured = (file: string) => readFileSync(`${dataDir}/${file}`, "utf8");
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request) => {
  const target = String(url);
  if (target.includes("products_singles_22")) return new Response(captured("real-products.json"));
  if (target.includes("price_guide_22")) return new Response(captured("real-prices.json"));
  if (target.includes("frankfurter")) return new Response(captured("real-fx.json"));
  if (target.includes("rules-hub")) return new Response(captured("real-rules.html"));
  if (target.includes("releases/latest/download")) return new Response(captured("latest-cards.json"));
  throw new Error(`Unexpected network request in captured-data test: ${target}`);
}) as typeof fetch;
const proposal = (r: typeof references[number]): DeckProposal => ({ name: r.name, entries: r.entries.map(e => ({ ...e })), strategy: r.strategy, referenceIds: [r.id], summary: "Real published reference", replacements: [], limitations: [] });
const report: Record<string, unknown> = { date: "2026-10-07", evaluatedAt: new Date().toISOString(), inputMode: "Captured real sources replayed at their collection date", inventory: { source: inventory.sourceName, version: inventory.version, rows: inventory.rows.length, playableIdentities: Object.keys(realOwned).length, copies: Object.values(realOwned).reduce((s, n) => s + n, 0), sha256: createHash("sha256").update(JSON.stringify(inventory.rows)).digest("hex") }, syntheticCasesAreLabelled: true, gamesPlayed: 0, paidAICalls: 0 };
try {
  const [prices, fx, rulesAt] = await Promise.all([loadPrices(), loadFx(), verifyCurrentRules()]);
  const feed = validGalleryCards(JSON.parse(captured("latest-cards.json")));
  report.sources = { priceGuideAt: prices.createdAt, fxAt: fx.date, rulesCheckedAt: rulesAt, cardFeedCards: feed.length };
  for (const ref of references) {
    assert.deepEqual(validateDeck(ref.entries), [], ref.name);
    const parsed = parseAdvisorDeck(ref.name, exportDeck(proposal(ref)));
    assert.deepEqual(parsed.unmatched, []); assert.deepEqual(validateDeck(parsed.deck.entries), [], ref.name);
    assert.equal(exportDeck(parsed.deck), exportDeck(proposal(ref)));
    assert.equal(analyzeStrategy(parsed.deck, ref).loss, 0, ref.name);
  }
  const namesHaveNoEffects = { ...cardsById.get("boots of swiftness")!, text: "[Equip]" };
  assert.ok(!cardRoles(namesHaveNoEffects).includes("movement"));
  assert.ok(cardDataGaps(namesHaveNoEffects).length);
  assert.ok(parseAdvisorDeck("Bad", "legend\n1 Rogue Assassin\nmain\n3 Unknown Card").unmatched.length);
  const raw = proposal(references.find(r => r.legendId === "rogue assassin" && r.evidenceKind === "official")!);
  const parsedCommon = parseAdvisorDeck("Common headings", exportDeck(raw).replace(/^main$/m, "Main Deck").replace(/^chosen$/m, "Chosen champion").replace(/^(\d+) /gm, "$1x "));
  assert.equal(parsedCommon.unmatched.length, 0); assert.deepEqual(validateDeck(parsedCommon.deck.entries), []);
  const fullyOwned: Record<string, number> = {};
  for (const c of builderCards) fullyOwned[c.id] = 20;
  const degraded = { ...raw, entries: raw.entries.map(e => ({ ...e })) };
  const engineLine = degraded.entries.find(e => e.section === "main" && e.cardId === "shuriken flip")!;
  engineLine.quantity--;
  const flex = builderCards.find(c => c.type === "Spell" && c.domains.every(d => cardsById.get("rogue assassin")!.domains.includes(d)) && !degraded.entries.some(e => e.cardId === c.id) && !/signature/i.test(c.super ?? "") && !["called shot", "fight or flight"].includes(c.id))!;
  degraded.entries.push({ cardId: flex.id, quantity: 1, section: "main" });
  assert.deepEqual(validateDeck(degraded.entries), []);
  const upgrades = upgradeDeck(degraded, fullyOwned, prices, fx, 0, references.find(r => r.id === raw.referenceIds[0]));
  assert.ok(upgrades.packages.length); assert.ok(upgrades.packages.some(p => p.after.engineDeficit < upgrades.before.engineDeficit));
  for (const p of upgrades.packages) { assert.equal(p.assessment.totalSek, 0); assert.equal(p.assessment.missingCopies, 0); assert.deepEqual(validateDeck(p.deck.entries), []); }
  const ranking = rankDeckCandidates([degraded, raw], fullyOwned, prices, fx, 0);
  assert.equal(exportDeck(ranking[0].deck), exportDeck(raw));
  assert.equal(rankDeckCandidates([raw], {}, null, null, 100000).length, 0, "Unknown prices cannot validate a purchase.");
  assert.equal(collectionCandidates("rogue assassin", {}, prices, fx, 0).length, 0, "Missing Legend cannot be filled with another Legend.");
  const realExamples = [];
  let realDiana: DeckProposal | null = null;
  for (const legendId of ["rogue assassin", "scorn of the moon", "blade dancer", "heart of the tempest", "eye of twilight"]) {
    const examples: Record<string, unknown> = { legendId };
    for (const budget of [0, 250, 1000]) {
      const start = performance.now(); const candidates = collectionCandidates(legendId, realOwned, prices, fx, budget);
      if (legendId === "scorn of the moon" && budget === 250) realDiana = candidates[0]?.deck ?? null;
      for (const c of candidates) { assert.equal(c.assessment.budgetValid, true); assert.deepEqual(validateDeck(c.deck.entries), []); if (!budget) assert.equal(c.assessment.missingCopies, 0); }
      examples[String(budget)] = { candidates: candidates.length, elapsedMs: Math.round(performance.now() - start), best: candidates[0] ? { name: candidates[0].deck.name, strategy: candidates[0].deck.strategy, purchaseSek: candidates[0].assessment.totalSek, missingCopies: candidates[0].assessment.missingCopies, engineDeficit: candidates[0].analysis.engineDeficit, referenceIds: candidates[0].deck.referenceIds, deckText: exportDeck(candidates[0].deck) } : null };
    }
    realExamples.push(examples);
  }
  report.realInventoryExamples = realExamples;
  assert.ok(realDiana, "A real-inventory budget deck must be produced, not just refused.");
  const realUpgrade = upgradeDeck(realDiana, realOwned, prices, fx, 1000);
  assert.ok(realUpgrade.packages.length, "The real-inventory draft must have an actionable priced upgrade.");
  for (const p of realUpgrade.packages) { assert.equal(p.assessment.budgetValid, true); assert.ok(p.after.loss < realUpgrade.before.loss); assert.deepEqual(validateDeck(p.deck.entries), []); }
  report.realUpgrade = { beforeEngineDeficit: realUpgrade.before.engineDeficit, packages: realUpgrade.packages.map(p => ({ costSek: p.assessment.totalSek, afterEngineDeficit: p.after.engineDeficit, benefit: p.benefit, tradeoffs: p.tradeoffs, changes: p.changes, deckText: p.deckText })) };
  const realRef = references.find(r => r.legendId === "blade dancer" && r.evidenceKind === "official")!;
  const realAssessment = assessDeck(realRef.entries, realOwned, prices, fx, 1000);
  report.realImportedDeck = { name: realRef.name, source: realRef.url, missingCopies: realAssessment.missingCopies, completionSek: realAssessment.totalSek, unpricedCopies: realAssessment.unpricedCopies, analysis: analyzeStrategy(proposal(realRef), realRef) };
  const scan = compareRelease(raw, feed);
  assert.ok(scan.previewCount > 0); assert.ok(scan.candidates.filter(c => c.set === "Radiance").every(c => c.status.startsWith("Preview")));
  report.realReleaseScan = scan;
  await assert.rejects(Promise.resolve().then(() => validGalleryCards([{ fullName: "Malformed" }])), /incomplete/);
  const created = await saveDeck("advisor-owner", { name: raw.name.slice(0, 80), deckText: exportDeck(raw), hideRunes: false, hideTokens: false });
  assert.ok(created); assert.equal((await getDeckVersions("advisor-owner", created.deckId)).length, 1);
  await saveDeck("advisor-owner", { deckId: created.deckId, name: "Revised real Akali list", deckText: exportDeck(degraded), hideRunes: false, hideTokens: false });
  const versions = await getDeckVersions("advisor-owner", created.deckId);
  assert.equal(versions.length, 2); assert.equal(versions[1].deckText, exportDeck(raw));
  assert.deepEqual(await getDeckVersions("other-user", created.deckId), []);
  assert.equal(await saveDeck("other-user", { deckId: created.deckId, name: "Wrong user", deckText: "x", hideRunes: false, hideTokens: false }), null);
  assert.equal(await deleteDeck("other-user", created.deckId), false);
  assert.equal((await getDeckVersions("advisor-owner", created.deckId)).length, 2);
  // Seed the isolated database with the captured current inventory, never mutate live holdings.
  sqlite.prepare("INSERT INTO bootstrap_owner (id,user_id) VALUES (1,?)").run("advisor-owner");
  sqlite.prepare("INSERT INTO collection_meta VALUES (?, ?, ?, ?, ?, ?)").run("advisor-owner", "captured", JSON.stringify(inventory.headers), inventory.version, "2026-09-30T11:26:14.423Z", inventory.sourceName);
  const insert = sqlite.prepare("INSERT INTO inventory_rows VALUES (?, ?, ?, ?)");
  inventory.rows.forEach((row, i) => insert.run("advisor-owner", "captured", i, JSON.stringify(row)));
  const request = (body: unknown, origin = "https://example.test") => new Request("https://example.test/api/advisor", { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
  let response = await adviserPOST(request({ action: "analyze", deckText: exportDeck(raw), budget: 1000 }));
  assert.equal(response.status, 200); const analyzed = await response.json() as { collectionVersion: number; assessment: { missingCopies: number } };
  assert.equal(analyzed.collectionVersion, inventory.version);
  response = await adviserPOST(request({ action: "releases", deckText: exportDeck(raw), deckId: created.deckId })); assert.equal(response.status, 200);
  response = await adviserPOST(request({ action: "analyze", deckText: exportDeck(raw) }, "https://other.test")); assert.equal(response.status, 403);
  setTestUser(null); assert.equal((await adviserPOST(request({ action: "build", legendId: "any" }))).status, 401);
  setTestUser({ userId: "other-user" });
  const privateVersions = await decksGET(new Request(`https://example.test/api/decks?deckId=${created.deckId}`));
  assert.deepEqual((await privateVersions.json() as { versions: unknown[] }).versions, []);
  setTestUser({ userId: "advisor-owner" });
  response = await adviserPOST(request({ action: "build", legendId: "any", budget: 1000 })); assert.equal(response.status, 200);
  const wholeCollection = await response.json() as { candidates: { deck: DeckProposal; assessment: { totalSek: number; missingCopies: number } }[] };
  report.wholeCollection = wholeCollection.candidates.map(c => ({ strategy: c.deck.strategy, legendId: c.deck.entries.find(e => e.section === "legend")!.cardId, purchaseSek: c.assessment.totalSek, missingCopies: c.assessment.missingCopies }));
  assert.equal(await deleteDeck("advisor-owner", created.deckId), true); assert.deepEqual(await getDeckVersions("advisor-owner", created.deckId), []);
  report.persistence = { migrationApplied: true, versions: 2, originalPreserved: true, crossAccountAccessDenied: true, historyRemovedWithExplicitDeckDeletion: true };
  report.regressions = { publishedDeckRoundTrips: references.length, engineRestoration: "Controlled degraded real Akali list with synthetic full holdings; zero-cost package restored engine copies", candidateRanking: "Controlled stronger engine candidate outranked degraded candidate", unknownPriceRejected: true, malformedFeedRejected: true, crossOriginWriteRejected: true, unauthenticatedAccessRejected: true };
  if (process.env.ADVISER_REPORT_PATH) writeFileSync(process.env.ADVISER_REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, inventoryRows: inventory.rows.length, realExamples: realExamples.map(e => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, k === "legendId" ? v : { ...(v as object), best: (v as { best: { deckText?: string } }).best ? { ...(v as { best: object }).best, deckText: undefined } : null }]))), releasePreviews: scan.previewCount, wholeCollection: report.wholeCollection, persistence: report.persistence }, null, 2));
} finally { globalThis.fetch = originalFetch; Date.now = originalNow; sqlite.close(); }
