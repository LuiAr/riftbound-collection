import deckMetadata from "../data/deck-card-metadata.json";
import type { DisplayCard } from "./collection";

const metadata = deckMetadata as Record<string, { fullName: string; type: string }>;

export type DeckCopyGoal = { name: string; limit: number; owned: number; missing: number };

const cardMetadata = (card: DisplayCard) => metadata[card.code] ?? metadata[card.code.replace("-star-", "-")];
const normalizedName = (name: string) => name.normalize("NFKD").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();

export function deckCardName(card: DisplayCard): string {
  return cardMetadata(card)?.fullName || card.name;
}

export function deckCardKey(card: DisplayCard): string {
  return normalizedName(deckCardName(card));
}

export function deckCopyLimit(card: DisplayCard): number | null {
  if (card.set === "Radiance" || card.set === "Radiance Promos") return null;
  if (/-t\d+/i.test(card.code) || /^t\d+/i.test(card.number)) return null;

  const type = cardMetadata(card)?.type;

  if (type === "Legend" || type === "Battlefield") return 1;
  if (type === "Rune" || /^r\d+[a-z]?$/i.test(card.number)) return 12;
  return 3;
}

export function deckCopyGoals(cards: readonly DisplayCard[]): Map<string, DeckCopyGoal> {
  const goals = new Map<string, DeckCopyGoal>();
  for (const card of cards) {
    const limit = deckCopyLimit(card);
    if (card.extra || limit === null || limit === 12) continue;
    const key = deckCardKey(card);
    if (!goals.has(key)) goals.set(key, { name: deckCardName(card), limit, owned: 0, missing: limit });
  }
  for (const card of cards) {
    if (card.set === "Radiance" || card.set === "Radiance Promos") continue;
    const goal = goals.get(deckCardKey(card));
    if (goal) goal.owned += card.quantity;
  }
  for (const goal of goals.values()) goal.missing = Math.max(0, goal.limit - goal.owned);
  return goals;
}
