import { isOvernumbered, radianceChecklistComplete, type DisplayCard } from "./collection";

export type OneOfEachGoal = { owned: number; total: number; missing: DisplayCard[] };

export function oneOfEachGoal(cards: readonly DisplayCard[], selectedSet: string, options?: { includeRadiance?: boolean }): OneOfEachGoal {
  const includeRadiance = options?.includeRadiance ?? radianceChecklistComplete;
  const eligible = cards.filter((card) =>
    !card.extra && (card.set !== "Radiance" || includeRadiance)
    && (selectedSet === "All sets" || card.set === selectedSet)
    && !/promo/i.test(card.set) && /^\d+$/.test(card.number)
    && ["Common", "Uncommon", "Rare"].includes(card.rarity)
    && !isOvernumbered(card)
  );
  return { owned: eligible.filter((card) => card.quantity > 0).length, total: eligible.length, missing: eligible.filter((card) => card.quantity === 0) };
}
