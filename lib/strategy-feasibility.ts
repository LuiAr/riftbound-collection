import { cheapestPrice, strategyProfile, type BuilderInput, type DeckEntry, type FxSnapshot, type ReferenceDeck } from "./deck-builder";
import { referencePriority } from "./deck-quality";
import type { PriceSnapshot } from "./prices";

export const FEASIBILITY_VERSION = "strategy-fit-v1";
export type PackageCost = { knownCostSek: number; missingCopies: number; unpricedCopies: number; withinBudget: boolean; owned: boolean; missing: { cardId: string; required: number; owned: number; missing: number; unitSek: number | null }[] };
export type FitStatus = "reference_ready" | "core_ready" | "core_gap" | "needs_review";
export type ReferenceFit = {
  referenceId: string; strategy: string; reviewedCore: boolean;
  minimumPackage: PackageCost; referenceCore: PackageCost; fullReference: PackageCost;
  coreQuantities: { cardId: string; quantity: number }[];
  favouriteIdsNotInReference: string[];
  ownedOnly: FitStatus; budget: FitStatus;
};
export type StrategyFeasibility = { version: string; budgetSek: number; pricesAt: string | null; fits: ReferenceFit[]; recommended: { ownedOnly: string[]; budget: string[] }; assumptions: string };

function quantities(entries: DeckEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.quantity);
  return counts;
}

function cost(counts: Map<string, number>, owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null, budgetSek: number): PackageCost {
  const missing = [...counts].map(([cardId, required]) => ({ cardId, required, owned: owned[cardId] ?? 0, missing: Math.max(0, required - (owned[cardId] ?? 0)), unitSek: cheapestPrice(cardId, prices, fx)?.unitSek ?? null })).filter((line) => line.missing > 0);
  const costOre = missing.reduce((sum, line) => sum + line.missing * Math.round((line.unitSek ?? 0) * 100), 0);
  const missingCopies = missing.reduce((sum, line) => sum + line.missing, 0);
  const unpricedCopies = missing.reduce((sum, line) => sum + (line.unitSek === null ? line.missing : 0), 0);
  return { knownCostSek: costOre / 100, missingCopies, unpricedCopies, withinBudget: unpricedCopies === 0 && costOre <= Math.floor(budgetSek * 100 + 1e-6), owned: missingCopies === 0, missing };
}

export function strategyFeasibility(refs: ReferenceDeck[], input: BuilderInput, owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null): StrategyFeasibility {
  const groups = new Map<string, ReferenceDeck[]>();
  for (const ref of refs) groups.set(ref.strategy, [...(groups.get(ref.strategy) ?? []), ref]);
  const fits = refs.map((ref): ReferenceFit => {
    const group = groups.get(ref.strategy)!;
    const essential = new Set(strategyProfile(group).filter((card) => card.essential).map((card) => card.cardId));
    const reviewedCore = group.every((source) => source.strategyReviewed) && essential.size > 0;
    const coreEntries = ref.entries.filter((entry) => entry.section === "legend" || entry.section === "chosen" || entry.section === "main" && essential.has(entry.cardId));
    const core = quantities(coreEntries);
    const minimum = quantities(coreEntries.filter((entry) => entry.section === "legend" || entry.section === "chosen"));
    for (const cardId of essential) {
      minimum.set(cardId, Math.max(minimum.get(cardId) ?? 0, 1));
      core.set(cardId, Math.max(core.get(cardId) ?? 0, 1));
    }
    for (const cardId of input.favouriteIds) {
      core.set(cardId, Math.max(core.get(cardId) ?? 0, 1));
      minimum.set(cardId, Math.max(minimum.get(cardId) ?? 0, 1));
    }
    const favouriteIdsNotInReference = input.favouriteIds.filter((cardId) => !ref.entries.some((entry) => entry.cardId === cardId && ["main", "chosen"].includes(entry.section)));
    const referenceCore = cost(core, owned, prices, fx, input.budgetSek);
    const minimumPackage = cost(minimum, owned, prices, fx, input.budgetSek);
    const fullReference = cost(quantities(ref.entries), owned, prices, fx, input.budgetSek);
    const status = (mode: "ownedOnly" | "budget"): FitStatus => {
      const fitsMode = (value: PackageCost) => mode === "ownedOnly" ? value.owned : value.withinBudget;
      if (fitsMode(fullReference) && favouriteIdsNotInReference.length === 0) return "reference_ready";
      if (!reviewedCore) return "needs_review";
      return fitsMode(referenceCore) ? "core_ready" : "core_gap";
    };
    return { referenceId: ref.id, strategy: ref.strategy, reviewedCore, minimumPackage, referenceCore, fullReference, coreQuantities: [...core].map(([cardId, quantity]) => ({ cardId, quantity })), favouriteIdsNotInReference, ownedOnly: status("ownedOnly"), budget: status("budget") };
  });
  const rank = { reference_ready: 0, core_ready: 1, needs_review: 2, core_gap: 3 };
  const recommend = (mode: "ownedOnly" | "budget") => {
    const sorted = [...fits].sort((a, b) => rank[a[mode]] - rank[b[mode]] || referencePriority(refs.find((ref) => ref.id === a.referenceId)!) - referencePriority(refs.find((ref) => ref.id === b.referenceId)!) || a.referenceCore.unpricedCopies - b.referenceCore.unpricedCopies || a.referenceCore.knownCostSek - b.referenceCore.knownCostSek || a.referenceId.localeCompare(b.referenceId));
    const seen = new Set<string>();
    return sorted.filter((fit) => { if (seen.has(fit.strategy)) return false; seen.add(fit.strategy); return true; }).map((fit) => fit.referenceId);
  };
  return { version: FEASIBILITY_VERSION, budgetSek: input.budgetSek, pricesAt: prices?.createdAt ?? null, fits, recommended: { ownedOnly: recommend("ownedOnly"), budget: recommend("budget") }, assumptions: "Advisory package costs from confirmed holdings and missing copies only; shipping excluded. Each package uses one actual reference, never pooled quantities across strategies. Reference-ready covers the full list including its sideboard. Core-ready covers reviewed engine quantities, Legend, chosen champion and requested favourites, not the remaining deck. Minimum package uses one copy of each annotated engine card and is only an optimistic floor, not a playable engine. Core annotations are incomplete; needs-review strategies remain eligible. Core gaps can sometimes be resolved by reviewed reductions or a different strategy. No affordability status establishes competitive strength." };
}

export function feasibilityGuidance(feasibility: StrategyFeasibility) {
  const summary = ({ missing: _missing, ...value }: PackageCost) => value;
  return { ...feasibility, fits: feasibility.fits.map((fit) => ({ ...fit, minimumPackage: summary(fit.minimumPackage), fullReference: summary(fit.fullReference) })) };
}
