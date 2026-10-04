import assert from "node:assert/strict";
import { assessDeck, references, type BuilderInput } from "../lib/deck-builder";
import { strategyFeasibility } from "../lib/strategy-feasibility";
import { benchmarkCases } from "../lib/deck-benchmark";
import { evaluateBuild } from "../lib/server-builder";

const akali = references.find((ref) => ref.id === "01c04a0e-833c-47e6-94eb-f0686e1f93ba")!;
const input: BuilderInput = { legendId: akali.legendId, mode: "competitive", favouriteIds: [], budgetSek: 250, extras: {} };
const owned = Object.fromEntries(akali.entries.map((entry) => [entry.cardId, 20]));
const fx = { date: "2026-10-04", eurSek: 10, usdSek: 10 };
const prices = { createdAt: "2026-10-04", quotes: {}, playableOffers: { "astral heron": [{ set: "Synthetic", productId: 1, standard: 10, foil: 8, printingVerified: false }] } };
const missingHerons = { ...owned, "astral heron": 1 };
const fit = strategyFeasibility([akali], input, missingHerons, prices, fx).fits[0];
assert.equal(fit.reviewedCore, true);
assert.equal(fit.referenceCore.knownCostSek, 160, "Two missing Herons at the cheaper 80 SEK finish cost 160, not 240.");
assert.equal(fit.referenceCore.missingCopies, 2);
assert.equal(fit.minimumPackage.owned, true, "One owned Heron meets only the optimistic single-copy floor.");
assert.equal(fit.ownedOnly, "core_gap", "One copy is not the reference's redundant core.");
assert.equal(fit.budget, "reference_ready");
assert.equal(strategyFeasibility([akali], { ...input, budgetSek: 159.99 }, missingHerons, prices, fx).fits[0].budget, "core_gap");
const unknown = strategyFeasibility([akali], input, missingHerons, null, fx).fits[0];
assert.equal(unknown.referenceCore.knownCostSek, 0);
assert.equal(unknown.referenceCore.unpricedCopies, 2);
assert.equal(unknown.referenceCore.withinBudget, false);
assert.equal(unknown.budget, "core_gap");
const pennies = { ...prices, playableOffers: { "astral heron": [{ ...prices.playableOffers["astral heron"][0], standard: 0.033, foil: null }] } };
assert.equal(strategyFeasibility([akali], { ...input, budgetSek: 0.66 }, missingHerons, pennies, fx).fits[0].budget, "reference_ready");
assert.equal(strategyFeasibility([akali], { ...input, budgetSek: 0.65 }, missingHerons, pennies, fx).fits[0].budget, "core_gap");
const expensiveLegend = { ...owned, [akali.legendId]: 0 };
assert.equal(strategyFeasibility([akali], input, expensiveLegend, null, fx).fits[0].referenceCore.unpricedCopies, 1, "Legend ownership is not assumed.");
const ireliaTempo = references.find((ref) => ref.id === "ref-658f20504e62734c")!;
const ireliaHeron = references.find((ref) => ref.id === "ref-931339d8eae36e0f")!;
const ireliaOwned = Object.fromEntries([...ireliaTempo.entries, ...ireliaHeron.entries].map((entry) => [entry.cardId, 20]));
ireliaOwned["astral heron"] = 0;
const ireliaFit = strategyFeasibility([ireliaHeron, ireliaTempo], { ...input, legendId: ireliaTempo.legendId }, ireliaOwned, null, fx);
assert.equal(ireliaFit.recommended.ownedOnly[0], ireliaTempo.id);
assert.equal(ireliaFit.recommended.budget[0], ireliaTempo.id);
assert.ok(!ireliaFit.fits.find((value) => value.referenceId === ireliaTempo.id)!.coreQuantities.some((card) => card.cardId === "astral heron"));
assert.equal(ireliaFit.fits.find((value) => value.referenceId === ireliaHeron.id)!.budget, "core_gap");

const cases = benchmarkCases();
assert.equal(cases.length, 48);
assert.equal(new Set(cases.map((value) => value.id)).size, 48);
assert.equal(new Set(cases.map((value) => value.context.input.legendId)).size, 8);
let versions = 0;
for (const value of cases) {
  const { context, baseline } = value;
  const raw = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ ownedOnly: baseline, budget: baseline, explanation: "Controlled reference baseline" }) }] }] };
  const result = evaluateBuild(raw, context, 0);
  assert.equal(Boolean(result.ownedOnly), value.baselineFits.ownedOnly, `${value.id}: owned-only baseline`);
  assert.equal(Boolean(result.budget), value.baselineFits.budget, `${value.id}: budget baseline`);
  assert.equal(result.feasibility, context.feasibility, "Accepted jobs preserve the generation-time comparison.");
  for (const mode of ["ownedOnly", "budget"] as const) {
    const deck = result[mode];
    if (!deck) continue;
    versions++;
    const assessment = assessDeck(deck.entries, context.owned, context.prices, context.fx, context.input.budgetSek);
    assert.equal(mode === "ownedOnly" ? assessment.ownedOnlyValid : assessment.budgetValid, true);
  }
  if (value.scenario === "complete") assert.ok(result.ownedOnly && result.budget);
  if (value.scenario === "empty_zero_budget") assert.equal(result.ownedOnly || result.budget, null);
  if (value.scenario === "unknown_price") assert.equal(result.budget, null);
  if (value.scenario === "fun_favourite") {
    assert.equal(result.budget, null, "Copying a reference cannot satisfy an absent favourite.");
    assert.ok(context.feasibility?.fits.every((fit) => fit.referenceId !== value.referenceId || fit.favouriteIdsNotInReference.includes(value.changedCardId)));
  }
  if (value.cohort === "unreviewed") assert.ok(context.feasibility?.fits.every((fit) => !fit.reviewedCore));
}
console.log(`Strategy feasibility checks passed: missing-copy and cent arithmetic, cheapest finish, unknown prices, core redundancy, strategy separation and 48 benchmark cases (${versions} accepted unmodified baseline versions). No AI requests or game simulations.`);
