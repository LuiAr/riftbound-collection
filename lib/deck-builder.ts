import data from "../data/builder-cards.json";
import referenceData from "../data/builder-references.json";
import { catalog, isAlternatePrinting, isOvernumbered, type DisplayCard } from "./collection";
import { deckCardKey } from "./deck-copy-limit";
import { priceKey, type PriceSnapshot } from "./prices";

export type BuilderCard = { id: string; name: string; type: string; super: string | null; tags: string[]; domains: string[]; energy: number | null; power: string | null; might: string | null; text: string; printings: string[] };
export type DeckSection = "legend" | "chosen" | "main" | "runes" | "battlefields" | "sideboard";
export type DeckEntry = { cardId: string; quantity: number; section: DeckSection };
export type ReferenceDeck = { id: string; name: string; url: string; source: string; date: string; dateKind: string; event: string | null; placement: number | null; accessedAt: string; legendId: string; strategy: string; evidence: string; entries: DeckEntry[] };
export type FxSnapshot = { date: string; eurSek: number; usdSek: number };
export type PurchasePrice = { unitSek: number; unitEur: number; printingCode: string; finish: string; productId: number; printingVerified?: boolean; set?: string };
export type BuilderLine = { cardId: string; required: number; owned: number; missing: number; price: PurchasePrice | null };
export type DeckAssessment = { errors: string[]; lines: BuilderLine[]; totalSek: number; unpricedCopies: number; missingCopies: number; budgetValid: boolean; ownedOnlyValid: boolean };
export type DeckProposal = { name: string; strategy: string; summary: string; referenceIds: string[]; entries: DeckEntry[]; replacements: { fromCardId: string; toCardId: string; reason: string; compromise: string }[]; limitations: string[] };
export type BuilderInput = { mode: "competitive" | "fun"; legendId: string; favouriteIds: string[]; budgetSek: number; extras: Record<string, number> };
export const builderCards = data.cards as BuilderCard[];
export const cardsById = new Map(builderCards.map((card) => [card.id, card]));
export const references = referenceData as ReferenceDeck[];
export const RULES = {
  checkedAt: "2026-10-03", effectiveAt: "2026-09-18", format: "Standard 1v1",
  source: "https://playriftbound.com/en-us/rules-hub/",
  core: "https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/e9ac8e3d33e0f78cef296f5945aba7bc1313b086.pdf",
  tournament: "https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/503da65669ced10598d62925a6f6bc15111af726.pdf",
  bans: ["Called Shot", "Ekko, Recurrent", "Draven, Vanquisher", "Fight or Flight", "Scrapheap", "Stealthy Pursuer", "Stacked Deck", "The Arena's Greatest", "Aspirant's Climb", "Dreaming Tree", "Obelisk of Power", "Reaver's Row"],
};
export const normalizeCard = (name: string) => name.normalize("NFKD").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
const banned = new Set([...RULES.bans.map(normalizeCard), "the dreaming tree"]);
export const isBannedCard = (name: string) => banned.has(normalizeCard(name));
const codeIds = data.codes as Record<string, string>;
export function cardIdFor(card: DisplayCard): string | undefined {
  return codeIds[card.code] ?? codeIds[card.code.replace("-star-", "-")] ?? (cardsById.has(deckCardKey(card)) ? deckCardKey(card) : undefined);
}
export function ownedInventory(cards: readonly DisplayCard[], extras: Record<string, number> = {}): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    const id = cardIdFor(card);
    if (id) counts[id] = (counts[id] ?? 0) + card.quantity;
  }
  for (const [id, quantity] of Object.entries(extras)) if (cardsById.has(id) && Number.isSafeInteger(quantity) && quantity >= 0) counts[id] = (counts[id] ?? 0) + quantity;
  return counts;
}
export function compatible(card: BuilderCard, legend: BuilderCard): boolean {
  return card.domains.every((domain) => domain === "Colorless" || legend.domains.includes(domain)) && (card.super !== "Signature" || card.tags.some((tag) => legend.tags.includes(tag)));
}
export function validateDeck(entries: DeckEntry[]): string[] {
  const errors: string[] = [];
  const quantities = new Map<string, number>();
  const sectionCounts = new Map<string, number>();
  const seen = new Set<string>();
  const legends = entries.filter((e) => e.section === "legend");
  const chosen = entries.filter((e) => e.section === "chosen");
  const legend = legends.length === 1 ? cardsById.get(legends[0].cardId) : undefined;
  if (!legend || legend.type !== "Legend" || legends[0].quantity !== 1) errors.push("Choose exactly one Legend.");
  if (chosen.length !== 1 || chosen[0].quantity !== 1) errors.push("Choose exactly one champion unit.");
  let signatureCount = 0;
  for (const entry of entries) {
    const card = cardsById.get(entry.cardId);
    if (!card || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 12) { errors.push("An unknown card or invalid quantity was supplied."); continue; }
    const uniqueKey = `${entry.section}|${entry.cardId}`;
    if (seen.has(uniqueKey)) errors.push(`${card.name} appears twice in the same section.`);
    seen.add(uniqueKey);
    sectionCounts.set(entry.section, (sectionCounts.get(entry.section) ?? 0) + entry.quantity);
    if (isBannedCard(card.name)) errors.push(`${card.name} is banned in Standard.`);
    if (legend && !compatible(card, legend)) errors.push(`${card.name} is incompatible with the Legend's domains or champion tag.`);
    if (["main", "sideboard", "chosen"].includes(entry.section)) {
      if (!["Unit", "Spell", "Gear"].includes(card.type)) errors.push(`${card.name} cannot be in the Main Deck or sideboard.`);
      quantities.set(entry.cardId, (quantities.get(entry.cardId) ?? 0) + entry.quantity);
      if (card.super === "Signature") signatureCount += entry.quantity;
    }
    if (entry.section === "chosen" && (card.type !== "Unit" || card.super !== "Champion" || !legend || !card.tags.some((tag) => legend.tags.includes(tag)))) errors.push(`${card.name} cannot be this Legend's chosen champion.`);
    if (entry.section === "runes" && card.type !== "Rune") errors.push(`${card.name} is not a Rune.`);
    if (entry.section === "battlefields" && (card.type !== "Battlefield" || entry.quantity !== 1)) errors.push("Use one copy of each unique Battlefield.");
    if (!["legend", "chosen", "main", "sideboard", "runes", "battlefields"].includes(entry.section)) errors.push("Unknown deck section.");
  }
  for (const [id, quantity] of quantities) if (quantity > 3) errors.push(`${cardsById.get(id)!.name} exceeds three copies across chosen champion, Main Deck and sideboard.`);
  if (signatureCount > 3) errors.push("Use at most three Signature cards across Main Deck and sideboard.");
  if ((sectionCounts.get("main") ?? 0) + (sectionCounts.get("chosen") ?? 0) !== 40) errors.push("The Main Deck must contain exactly 40 cards including the chosen champion.");
  if (sectionCounts.get("runes") !== 12) errors.push("The Rune Deck must contain exactly 12 runes.");
  if (sectionCounts.get("battlefields") !== 3) errors.push("Standard 1v1 requires three unique Battlefields.");
  if ((sectionCounts.get("sideboard") ?? 0) > 10) errors.push("The sideboard must contain 10 or fewer Main Deck cards.");
  return [...new Set(errors)];
}
export function cheapestPrice(id: string, prices: PriceSnapshot | null, fx: FxSnapshot | null): PurchasePrice | null {
  if (!prices || !fx) return null;
  const result: PurchasePrice[] = [];
  for (const offer of prices.playableOffers?.[id] ?? []) {
    for (const [finish, amount] of [["Standard", offer.standard], ["Foil", offer.foil]] as const) if (amount !== null && amount > 0) result.push({ unitSek: Math.ceil(amount * fx.eurSek * 100) / 100, unitEur: amount, printingCode: offer.set, set: offer.set, finish, productId: offer.productId, printingVerified: offer.printingVerified });
  }
  for (const code of cardsById.get(id)?.printings ?? []) {
    const card = catalog.find((c) => c.code === code);
    if (!card || isAlternatePrinting({ ...card, quantity: 0, foilQuantity: 0 }) || isOvernumbered({ ...card, quantity: 0, foilQuantity: 0 }) || card.rarity === "Showcase") continue;
    const quote = cardsById.get(id)?.name === card.name ? prices.quotes[priceKey(card.set, card.name)] : undefined;
    if (!quote) continue;
    for (const [finish, amount] of [["Standard", quote.standard], ["Foil", quote.foil]] as const) {
      if (amount !== null && amount > 0) result.push({ unitSek: Math.ceil(amount * fx.eurSek * 100) / 100, unitEur: amount, printingCode: code, finish, productId: quote.productId });
    }
  }
  return result.sort((a, b) => a.unitSek - b.unitSek)[0] ?? null;
}
export function assessDeck(entries: DeckEntry[], owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null, budgetSek: number): DeckAssessment {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.quantity);
  const lines = [...counts].map(([cardId, required]) => ({ cardId, required, owned: owned[cardId] ?? 0, missing: Math.max(0, required - (owned[cardId] ?? 0)), price: cheapestPrice(cardId, prices, fx) }));
  const totalSek = Math.ceil(lines.reduce((sum, line) => sum + line.missing * (line.price?.unitSek ?? 0), 0) * 100) / 100;
  const unpricedCopies = lines.reduce((sum, line) => sum + (line.price ? 0 : line.missing), 0);
  const missingCopies = lines.reduce((sum, line) => sum + line.missing, 0);
  const errors = validateDeck(entries);
  return { errors, lines, totalSek, unpricedCopies, missingCopies, budgetValid: !errors.length && !unpricedCopies && totalSek <= budgetSek, ownedOnlyValid: !errors.length && !missingCopies };
}
export function eligibleReferences(legendId: string): ReferenceDeck[] {
  return references.filter((ref) => ref.legendId === legendId && !validateDeck(ref.entries).length);
}
export function strategyProfile(refs: ReferenceDeck[]) {
  const frequencies = new Map<string, number>();
  const mainCopies = new Map<string, number[]>();
  for (const ref of refs) {
    const counts = new Map<string, number>();
    for (const entry of ref.entries.filter((e) => ["main", "chosen"].includes(e.section))) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.quantity);
    for (const [id, quantity] of counts) { frequencies.set(id, (frequencies.get(id) ?? 0) + 1); mainCopies.set(id, [...(mainCopies.get(id) ?? []), quantity]); }
  }
  return [...frequencies].map(([cardId, decks]) => ({ cardId, decks, total: refs.length, medianCopies: [...mainCopies.get(cardId)!].sort((a, b) => a - b)[Math.floor(decks / 2)], essential: ["shuriken flip", "akali deadly weapon", "astral heron"].includes(cardId) }));
}
export function representativeCard(id: string, inventory: readonly DisplayCard[], preferredCodes: string[] = []): DisplayCard | undefined {
  const owned = inventory.filter((c) => cardIdFor(c) === id);
  const code = preferredCodes.find((c) => cardsById.get(id)?.printings.includes(c));
  const printing = code ? catalog.find((c) => c.code === code) : owned.find((c) => c.quantity > 0) ?? catalog.find((c) => c.code === cardsById.get(id)?.printings[0]);
  return printing ? { ...printing, quantity: owned.find((c) => c.code === printing.code)?.quantity ?? 0, foilQuantity: owned.find((c) => c.code === printing.code)?.foilQuantity ?? 0 } : undefined;
}
export function exportDeck(proposal: DeckProposal): string {
  return (["legend", "chosen", "main", "runes", "battlefields", "sideboard"] as DeckSection[]).map((section) => `${section}\n${proposal.entries.filter((e) => e.section === section).map((e) => `${e.quantity} ${cardsById.get(e.cardId)?.name ?? e.cardId}`).join("\n")}`).join("\n\n");
}
