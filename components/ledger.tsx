import type { DisplayCard } from "../lib/collection";
import type { RarityKind } from "../lib/rarity";
import type { DeckCopyGoal } from "../lib/deck-copy-limit";
import { deckCopyLimit } from "../lib/deck-copy-limit";

const setCodes: Record<string, string> = {
  Radiance: "RAD",
  "Radiance Promos": "RAD",
  Vendetta: "VEN",
  Unleashed: "UNL",
  Spiritforged: "SFD",
  Origins: "OGN",
  "Proving Grounds": "OGS",
};

export function setCode(set: string): string {
  return setCodes[set] ?? set.slice(0, 3).toUpperCase();
}

export function collectorNumber(card: DisplayCard): string {
  return `${setCode(card.set)} ${card.number}`;
}

export function RarityGem({ kind, className = "" }: { kind: RarityKind | null | undefined; className?: string }) {
  return <span className={`rarity-gem gem-${kind ?? "unknown"}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}

export function deckPips(card: DisplayCard, goal: DeckCopyGoal | undefined): { limit: number; owned: number } | null {
  const limit = deckCopyLimit(card);
  if (limit === null || limit === 12 || card.extra) return null;
  return { limit, owned: Math.min(goal?.owned ?? card.quantity, limit) };
}

export function DeckPips({ card, goal, className = "" }: { card: DisplayCard; goal: DeckCopyGoal | undefined; className?: string }) {
  const pips = deckPips(card, goal);
  if (!pips) return null;
  const domain = (card.domains[0] ?? "Colorless").toLowerCase();
  return <span className={`deck-pips domain-${domain}${className ? ` ${className}` : ""}`} aria-hidden="true">{Array.from({ length: pips.limit }, (_, index) => <span key={index} className={index < pips.owned ? "filled" : ""} />)}</span>;
}

export function CollectorStrip({ card, kind, goal }: { card: DisplayCard; kind: RarityKind | null | undefined; goal: DeckCopyGoal | undefined }) {
  return <span className="collector-strip"><RarityGem kind={kind} /><span className="collector-number">{collectorNumber(card)}</span><DeckPips card={card} goal={goal} /></span>;
}

