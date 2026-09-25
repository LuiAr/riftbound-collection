import { isAlternatePrinting, isOvernumbered, type DisplayCard } from "./collection";

export type RarityKind = "common" | "uncommon" | "rare" | "epic" | "special";
export type CardTypeFilter = "all" | "normal" | RarityKind;

export function rarityFor(card: DisplayCard): { kind: RarityKind; label: string } | null {
  if (isOvernumbered(card)) return { kind: "special", label: `Over-numbered · ${card.rarity}` };
  if (isAlternatePrinting(card)) return { kind: "special", label: `Alternate art · ${card.rarity}` };
  if (card.rarity === "Showcase") return { kind: "special", label: "Showcase" };
  const kind = card.rarity.toLowerCase();
  if (kind === "common" || kind === "uncommon" || kind === "rare" || kind === "epic") {
    return { kind, label: card.rarity };
  }
  return null;
}

export function matchesCardType(card: DisplayCard, filter: CardTypeFilter, hideAlternates: boolean, hideOvernumbered: boolean): boolean {
  if (hideAlternates && isAlternatePrinting(card)) return false;
  if (hideOvernumbered && isOvernumbered(card)) return false;
  if (filter === "all") return true;
  const rarity = rarityFor(card)?.kind;
  if (filter === "normal") return rarity === "common" || rarity === "uncommon" || rarity === "rare";
  return rarity === filter;
}
