import deckMetadata from "../data/deck-card-metadata.json";
import type { DisplayCard } from "./collection";

const metadata = deckMetadata as Record<string, { fullName: string; type: string }>;

export function deckCopyLimit(card: DisplayCard): number | null {
  if (/-t\d+/i.test(card.code) || /^t\d+/i.test(card.number)) return null;

  const code = card.code.replace("-star-", "-");
  const type = metadata[card.code]?.type ?? metadata[code]?.type;

  if (type === "Legend" || type === "Battlefield") return 1;
  if (type === "Rune" || /^r\d+[a-z]?$/i.test(card.number)) return 12;
  return 3;
}
