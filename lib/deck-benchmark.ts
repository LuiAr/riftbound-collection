import fixture from "../tests/fixtures/deck-benchmark.json";
import { assessDeck, builderCards, cardsById, compatible, isBannedCard, references, strategyProfile, type BuilderInput, type DeckProposal } from "./deck-builder";
import { selectReferences } from "./deck-quality";
import { strategyFeasibility } from "./strategy-feasibility";
import type { BuildContext } from "./server-builder";
import type { PriceSnapshot } from "./prices";

export const BENCHMARK_VERSION = fixture.version;
export const BENCHMARK_SCENARIOS = ["complete", "flex_gap", "expensive_core", "unknown_price", "empty_zero_budget", "fun_favourite"] as const;
export type BenchmarkScenario = typeof BENCHMARK_SCENARIOS[number];
export type BenchmarkCase = { id: string; cohort: string; scenario: BenchmarkScenario; referenceId: string; changedCardId: string; context: BuildContext; baseline: DeckProposal; baselineFits: { ownedOnly: boolean; budget: boolean }; note: string };

export function benchmarkCases(): BenchmarkCase[] {
  return fixture.cases.flatMap((entry) => {
    const ref = references.find((source) => source.id === entry.referenceId && source.legendId === entry.legendId);
    if (!ref) throw new Error(`Frozen benchmark reference is unavailable: ${entry.referenceId}`);
    const refs = selectReferences(entry.legendId, Date.parse(fixture.referenceDate));
    if (!refs.some((source) => source.id === ref.id)) throw new Error(`Frozen benchmark reference is ineligible: ${ref.id}`);
    const legend = cardsById.get(entry.legendId)!;
    const essentials = new Set(strategyProfile(refs.filter((source) => source.strategy === ref.strategy)).filter((card) => card.essential).map((card) => card.cardId));
    const core = ref.entries.find((card) => card.section === "main" && essentials.has(card.cardId)) ?? ref.entries.find((card) => card.section === "main")!;
    const flexible = ref.entries.find((card) => card.section === "main" && !essentials.has(card.cardId))!;
    const favourite = builderCards.find((card) => card.type === "Unit" && compatible(card, legend) && !isBannedCard(card.name) && card.super !== "Signature" && !ref.entries.some((e) => e.cardId === card.id));
    if (!favourite) throw new Error(`No compatible favourite fixture for ${entry.legendId}`);
    return BENCHMARK_SCENARIOS.map((scenario): BenchmarkCase => {
      const owned: Record<string, number> = {};
      for (const card of ref.entries) owned[card.cardId] = (owned[card.cardId] ?? 0) + card.quantity;
      const offers = Object.fromEntries(builderCards.filter((card) => compatible(card, legend) && !isBannedCard(card.name)).map((card, index) => [card.id, [{ set: "Synthetic benchmark", productId: 900000 + index, standard: 1, foil: null, printingVerified: false }]]));
      const prices: PriceSnapshot = { createdAt: fixture.priceDate, quotes: {}, playableOffers: offers };
      const input: BuilderInput = { legendId: entry.legendId, mode: "competitive", favouriteIds: [], budgetSek: 1000, extras: {} };
      let changedCardId = "";
      let note = "Exact reference is owned; assess whether generation preserves its coherent strategy.";
      if (scenario === "flex_gap" || scenario === "unknown_price") {
        changedCardId = flexible.cardId;
        owned[changedCardId] -= 1;
        input.budgetSek = scenario === "flex_gap" ? 10 : 1000;
        if (scenario === "unknown_price") delete offers[changedCardId];
        note = scenario === "flex_gap" ? "One reference copy costs exactly 10 SEK; owned-only requires a real substitution. For unreviewed strategies its flexibility still needs review." : "One missing reference copy has no price; it cannot be treated as free. A coherent priced substitute remains possible.";
      }
      if (scenario === "expensive_core") {
        changedCardId = core.cardId;
        owned[changedCardId] = 0;
        offers[changedCardId][0].standard = 100.1;
        note = essentials.has(changedCardId) ? "A reviewed engine card costs 1001 SEK per copy against a 1000 SEK budget. Assess another strategy or a candid refusal." : "This strategy has no reviewed core; the expensive card is a reference card, not an independently established essential card.";
      }
      if (scenario === "empty_zero_budget") {
        for (const key of Object.keys(owned)) delete owned[key];
        input.budgetSek = 0;
        note = "No cards are confirmed owned and budget is zero. Both versions must be refused.";
      }
      if (scenario === "fun_favourite") {
        changedCardId = favourite.id;
        owned[favourite.id] = 1;
        input.mode = "fun";
        input.favouriteIds = [favourite.id];
        note = "A compatible owned favourite absent from the reference must be included with a meaningful strategic explanation.";
      }
      const fx = { date: fixture.priceDate, eurSek: 10, usdSek: 10 };
      const context: BuildContext = { input, owned, prices, fx, rulesCheckedAt: fixture.referenceDate, referenceIds: refs.map((source) => source.id), referenceSnapshot: refs, feasibility: strategyFeasibility(refs, input, owned, prices, fx) };
      const baseline: DeckProposal = { name: "Unmodified reference baseline", strategy: ref.strategy, summary: "Benchmark baseline; no strategic adaptation", entries: ref.entries, referenceIds: [ref.id], replacements: [], limitations: [] };
      const assessment = assessDeck(ref.entries, owned, prices, fx, input.budgetSek);
      const favouritesPresent = input.favouriteIds.every((id) => ref.entries.some((card) => card.cardId === id && ["main", "chosen"].includes(card.section)));
      return { id: `${entry.legendId}/${scenario}`, cohort: entry.cohort, scenario, referenceId: ref.id, changedCardId, context, baseline, baselineFits: { ownedOnly: assessment.ownedOnlyValid && favouritesPresent, budget: assessment.budgetValid && favouritesPresent }, note };
    });
  });
}
