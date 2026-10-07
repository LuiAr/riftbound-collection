import { builderCards, cardsById, compatible, normalizeCard, type BuilderCard, type DeckProposal } from "./deck-builder";
import { cardDataGaps, cardRoles } from "./deck-advisor";
import snapshot from "../data/release-preview.json";

export const RELEASE_SOURCE = "https://github.com/LouisCourrian/riftbound-cards/releases/latest/download/cards.json";
export type GalleryCard = { cardCode: string; fullName: string; cardSet: string; cardType: string; cardTypeLabels: string[]; domains: string[]; tags: string[]; energy: number | null; power: number | string | null; might: number | string | null; abilityEffective?: string; abilityOriginal: string; sourceUrl: string; scrapedAt: string; cardNumber: string };
export function validGalleryCards(raw: unknown): GalleryCard[] {
  if (!Array.isArray(raw) || raw.length > 5000 || raw.length < 500) throw new Error("The card feed is incomplete or has an unsupported shape.");
  const domains = new Set(["Fury", "Calm", "Mind", "Body", "Chaos", "Order", "Colorless"]);
  return raw.flatMap((value: unknown) => {
    const original = value as GalleryCard;
    if (!original || typeof original !== "object") throw new Error("The card feed contains unsupported records.");
    const c = { ...original, tags: original.tags ?? [], abilityOriginal: original.abilityOriginal ?? "" };
    // Partial reveals can omit domain identity. They must not enter compatibility checks.
    if (!c.domains && c.cardSet === "Radiance") return [];
    if (!c || typeof c.cardCode !== "string" || typeof c.fullName !== "string" || c.fullName.length > 120 || typeof c.cardSet !== "string" || typeof c.cardNumber !== "string" || !["Unit", "Spell", "Gear", "Legend", "Rune", "Battlefield", "Token"].includes(c.cardType) || !Array.isArray(c.domains) || !c.domains.every(d => domains.has(d)) || !Array.isArray(c.tags) || !c.tags.every(t => typeof t === "string") || !Array.isArray(c.cardTypeLabels) || typeof c.abilityOriginal !== "string" || c.abilityOriginal.length > 5000 || !(c.energy === null || Number.isSafeInteger(c.energy) && c.energy >= 0) || typeof c.sourceUrl !== "string" || !c.sourceUrl.startsWith("https://playriftbound.com/en-us/card-gallery/") || !Number.isFinite(Date.parse(c.scrapedAt))) throw new Error("The card feed contains unsupported records. No new cards were activated.");
    return [c];
  });
}
export function galleryToBuilder(c: GalleryCard): BuilderCard {
  const existing = builderCards.find(b => b.printings.includes(c.cardCode));
  return { id: existing?.id ?? normalizeCard(c.fullName), name: existing?.name ?? c.fullName, type: c.cardType, super: c.cardTypeLabels.includes("Champion") ? "Champion" : c.cardTypeLabels.includes("Signature") ? "Signature" : null,
    tags: c.tags, domains: c.domains, energy: c.energy, power: c.power === null ? null : String(c.power), might: c.might === null ? null : String(c.might), text: c.abilityEffective ?? c.abilityOriginal, printings: [c.cardCode] };
}
function rulesText(text: string) {
  return normalizeCard(text.replace(/\{power:any\}/gi, "[A]").replace(/\{power:[a-z]+\}/gi, "[C]").replace(/\{energy:(\d+)\}/gi, "[$1]").replace(/\{might\}/gi, "[S]").replace(/\{exhaust\}/gi, "[E]"));
}
export function compareRelease(deck: DeckProposal, records: GalleryCard[], knownIds = builderCards.map(c => c.id)) {
  const legend = cardsById.get(deck.entries.find(e => e.section === "legend")?.cardId ?? "");
  if (!legend) throw new Error("Identify the Legend before checking releases.");
  const known = new Set(knownIds), used = new Set(deck.entries.map(e => e.cardId));
  const unique = new Map<string, GalleryCard>();
  for (const c of records) { const card = galleryToBuilder(c); if (!unique.has(card.id)) unique.set(card.id, c); }
  const results = [...unique.values()].flatMap(c => {
    const card = galleryToBuilder(c), old = cardsById.get(card.id);
    const changed = old && (old.energy !== card.energy || old.might !== card.might || rulesText(old.text) !== rulesText(card.text));
    if (!compatible(card, legend) || !["Unit", "Spell", "Gear"].includes(card.type) || known.has(card.id) && !(changed && used.has(card.id))) return [];
    const preview = c.cardSet === "Radiance";
    const roles = cardRoles(card);
    return [{ cardId: card.id, name: card.name, set: c.cardSet, source: c.sourceUrl, text: card.text, energy: card.energy, roles, dataGaps: cardDataGaps(card), kind: changed && used.has(card.id) ? "Changed card in your deck" : "New compatible card", status: preview ? "Preview only; not activated" : "Available for review", reason: roles.length ? `Text signals: ${roles.join(", ")}. Review targeting, timing and the cards it would replace.` : "No confident role signal; inspect the card text.", scrapedAt: c.scrapedAt }];
  });
  return { checkedAt: new Date().toISOString(), source: "https://github.com/LouisCourrian/riftbound-cards", snapshotAt: records.reduce((last, c) => c.scrapedAt > last ? c.scrapedAt : last, ""), candidates: results.slice(0, 60), totalCandidates: results.length, previewCount: results.filter(c => c.status.startsWith("Preview")).length, note: "New cards are experiments until reviewed. Radiance remains outside playable recommendations while its checklist is incomplete or it is unreleased. This check never changes your collection or deck." };
}
let cache: { until: number; records: GalleryCard[] } | null = null;
export async function loadReleaseCards(): Promise<{ records: GalleryCard[]; cachedSnapshot: boolean }> {
  if (cache && cache.until > Date.now()) return { records: cache.records, cachedSnapshot: false };
  const response = await fetch(RELEASE_SOURCE, { signal: AbortSignal.timeout(15000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("The latest card feed is unavailable. Try again later.");
  const text = await response.text(); if (text.length > 3_000_000) throw new Error("The card feed exceeds the supported size.");
  const records = validGalleryCards(JSON.parse(text));
  cache = { until: Date.now() + 3600000, records }; return { records, cachedSnapshot: false };
}
export function previewSnapshot(): GalleryCard[] { return snapshot as GalleryCard[]; }
