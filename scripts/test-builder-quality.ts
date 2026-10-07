import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { env } from "../tests/fixtures/builder-env";
import { cardsById, references, RULES, strategyProfile, validateDeck, type BuilderInput, type DeckProposal } from "../lib/deck-builder";
import { accessProbability, jointAccessProbability, qualityChecks, referenceEvidence, referenceFingerprint, selectReferences, strategyGroups } from "../lib/deck-quality";
import { evaluateBuild, prepareBuild } from "../lib/server-builder";

const now = Date.parse("2026-10-03T20:33:43Z");
assert.equal(new Set(references.map((ref) => referenceFingerprint(ref))).size, references.length, "Duplicate printings/uploads must not multiply reference evidence.");
assert.equal(references.length, 57);
assert.equal(new Set(references.map((ref) => ref.legendId)).size, 34);
for (const ref of references) assert.deepEqual(validateDeck(ref.entries), [], ref.name);
assert.equal(referenceEvidence(selectReferences("blade dancer", now)).topEight, 2);
assert.ok(selectReferences("rogue assassin", now).every((ref) => ref.date >= RULES.effectiveAt));
const ireliaGroups = strategyGroups(selectReferences("blade dancer", now));
assert.equal(ireliaGroups.length, 2);
assert.equal(ireliaGroups.find((group) => group.strategy === "Irelia mobile tempo")?.cards.find((card) => card.cardId === "astral heron")?.essential ?? false, false);
assert.equal(ireliaGroups.find((group) => group.strategy === "Irelia Heron")?.cards.find((card) => card.cardId === "astral heron")?.essential, true);
assert.equal(strategyProfile(selectReferences("blade dancer", now)).some((card) => card.essential), false, "Mixed strategies must not share engine annotations.");
assert.equal(accessProbability(39, 0, 8), 0);
assert.equal(accessProbability(39, 3, 0), 0);
assert.equal(accessProbability(39, 3, 39), 1);
assert.equal(accessProbability(39, 40, 8), null);
assert.equal(jointAccessProbability(39, 20, 20, 8), null);
assert.ok(Math.abs(accessProbability(39, 3, 8)! - 0.5081518765729292) < 1e-12);
assert.ok(Math.abs(jointAccessProbability(39, 3, 3, 8)! - 0.2419752450712203) < 1e-12);
assert.ok(accessProbability(39, 1, 8)! < accessProbability(39, 3, 8)!);

// Independently enumerate a smaller draw pool to check the probability formula.
let hands = 0, hits = 0, both = 0;
for (let a = 0; a < 8; a += 1) for (let b = a + 1; b < 8; b += 1) for (let c = b + 1; c < 8; c += 1) {
  const hand = [a, b, c]; hands += 1;
  if (hand.some((card) => card < 2)) hits += 1;
  if (hand.some((card) => card < 2) && hand.some((card) => card >= 2 && card < 4)) both += 1;
}
assert.ok(Math.abs(accessProbability(8, 2, 3)! - hits / hands) < 1e-12);
assert.ok(Math.abs(jointAccessProbability(8, 2, 2, 3)! - both / hands) < 1e-12);

// These legends were not used to develop the Akali/Diana/Irelia engine annotations.
// This evaluates deterministic behavior and request construction, not live AI quality.
const heldOut = ["pridestalker", "emperor of the sands", "fire below the mountain", "heart of the tempest", "prodigal explorer"];
const fx = { date: "2026-10-02", eurSek: 10, usdSek: 10 };
const originalFetch = globalThis.fetch;
const originalKey = env.OPENAI_API_KEY;
env.OPENAI_API_KEY = "offline-test-placeholder";
globalThis.fetch = (async (url: string | URL | Request) => {
  assert.equal(String(url), RULES.source, "The offline evaluation must never contact a paid model.");
  return new Response(`<h2>Constructed Format Legality</h2>September 18, 2026<ul>${RULES.bans.map((name) => `<li>${name}</li>`).join("")}</ul><h2>2v2 Constructed Legality</h2><a href="${RULES.core}">Core</a><a href="${RULES.tournament}">Tournament</a>`);
}) as typeof fetch;
const raw = (deck: DeckProposal) => ({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ ownedOnly: deck, budget: deck, explanation: "Offline reference fixture" }) }] }] });
const results: object[] = [];
try {
  for (const legendId of new Set(references.map((ref) => ref.legendId))) {
    const refs = selectReferences(legendId, now);
    assert.ok(refs.length > 0 && refs.length <= 20, legendId);
    const ref = refs[0];
    const input: BuilderInput = { mode: "competitive", legendId, favouriteIds: [], budgetSek: 1000, extras: {} };
    const owned = Object.fromEntries(ref.entries.map((entry) => [entry.cardId, 20]));
    const prepared = await prepareBuild(input, owned, null, fx);
    const payload = JSON.parse(JSON.parse(prepared.body).input);
    assert.ok(payload.strategyGroups.length > 0);
    assert.ok(prepared.reservationOre <= 1000);
    assert.ok(prepared.context.referenceSnapshot?.every((reference) => reference.legendId === legendId));
    const deck: DeckProposal = { name: "Reference fixture", strategy: ref.strategy, summary: "Offline fixture", entries: ref.entries, referenceIds: [ref.id], replacements: [], limitations: [] };
    const accepted = evaluateBuild(raw(deck), prepared.context, 0);
    assert.ok(accepted.ownedOnly && accepted.budget, legendId);
    assert.equal(accepted.quality.ownedOnly?.pool, 39);
    const missing = ref.entries.find((entry) => entry.section === "main")!;
    const required = ref.entries.filter((entry) => entry.cardId === missing.cardId).reduce((sum, entry) => sum + entry.quantity, 0);
    const partlyOwned = { ...owned, [missing.cardId]: required - 1 };
    const syntheticPrices = { createdAt: "2026-10-03", quotes: {}, playableOffers: { [missing.cardId]: [{ set: "Vendetta", productId: 999999, standard: 1, foil: null, printingVerified: false }] } };
    const context = { ...prepared.context, owned: partlyOwned, prices: syntheticPrices, input: { ...input, budgetSek: 10 } };
    const purchased = evaluateBuild(raw(deck), context, 0);
    assert.equal(purchased.ownedOnly, null);
    assert.ok(purchased.budget, legendId);
    assert.equal(evaluateBuild(raw(deck), { ...context, input: { ...input, budgetSek: 9.99 } }, 0).budget, null);
    assert.equal(evaluateBuild(raw(deck), { ...context, prices: null }, 0).budget, null);
    const wrongLegend = { ...deck, entries: deck.entries.filter((entry) => entry.section !== "legend") };
    assert.equal(evaluateBuild(raw(wrongLegend), prepared.context, 0).ownedOnly, null);
    const wrongSources = { ...deck, referenceIds: [references.find((reference) => reference.legendId !== legendId)!.id] };
    assert.equal(evaluateBuild(raw(wrongSources), prepared.context, 0).ownedOnly, null);
    if (heldOut.includes(legendId)) results.push({ legendId, legend: cardsById.get(legendId)?.tags[0], reference: ref.name, source: ref.url, placement: ref.placement, evidence: referenceEvidence(refs), baselineQuality: accepted.quality.ownedOnly, checks: { requestPrepared: true, legalBaselineAccepted: true, missingCopyBudgetAccepted: true, falseOwnedClaimRejected: true, budgetOverrunRejected: true, unknownPriceRejected: true, invalidLegendRejected: true, foreignReferenceRejected: true }, liveAI: false, simulatedGames: 0 });
  }
  const diana = selectReferences("scorn of the moon", now).find((ref) => ref.evidenceKind === "official")!;
  const base: DeckProposal = { name: "Diana core", strategy: diana.strategy, summary: "", entries: diana.entries, referenceIds: [diana.id], replacements: [], limitations: [] };
  const reduced = { ...base, entries: base.entries.map((entry) => entry.cardId === "moonfall" && entry.section === "main" ? { ...entry, quantity: 1 } : entry.cardId === "flash" && entry.section === "main" ? { ...entry, quantity: 3 } : entry) };
  assert.deepEqual(validateDeck(reduced.entries), []);
  const report = qualityChecks(reduced, [diana]);
  assert.ok(report.warnings.some((warning) => warning.includes("Moonfall")));
  assert.equal(report.engine.find((card) => card.cardId === "moonfall")?.copies, 1);
  if (process.env.BUILDER_EVALUATION_OUTPUT) writeFileSync(process.env.BUILDER_EVALUATION_OUTPUT, JSON.stringify({ date: new Date().toISOString(), scope: "Offline regression and exact raw-draw evaluation, not a live AI or gameplay benchmark", references: references.length, legends: 34, heldOut: results, limitations: ["No paid AI requests or opponent simulation were run.", "Synthetic prices test arithmetic only; they are not purchasing advice.", "A live multi-seed AI benchmark and real match playtests are needed to attest competitive quality on additional legends."] }, null, 2));
  console.log(`Quality checks passed: ${references.length} distinct references, 34 legends, 5 held-out legend fixtures, current-rule selection, strategy isolation, request limits, budget rejection and independently enumerated draw probabilities. No live AI or gameplay benchmark.`);
} finally { globalThis.fetch = originalFetch; env.OPENAI_API_KEY = originalKey; }
