import type { CatalogCard } from "./collection";

export const RADIANCE_FEED_URL = "https://github.com/LouisCourrian/riftbound-cards/releases/latest/download/cards.json";
const RARITIES = new Set(["Common", "Uncommon", "Rare", "Epic", "Showcase"]);
const DOMAINS = new Set(["Fury", "Calm", "Mind", "Body", "Chaos", "Order", "Colorless"]);

export type RadianceCatalogFile = {
  source: string;
  scrapedAt: string | null;
  printedSetSize: number;
  cards: CatalogCard[];
};

/** Collector number as stored on other catalog cards: `068a-167` becomes `068a`, `sp3-005` becomes `sp3`. */
export function radianceCatalogNumber(cardNumber: string): string {
  const left = cardNumber.trim().toLowerCase().split("-")[0] ?? "";
  const match = /^(\d+)([a-z]*)$/.exec(left);
  if (!match) return left;
  return match[1].padStart(3, "0") + match[2];
}

export function radianceCatalogFromFeed(raw: unknown): { scrapedAt: string | null; cards: CatalogCard[] } {
  if (!Array.isArray(raw)) throw new Error("The Radiance card feed is not a list.");
  const cards: CatalogCard[] = [];
  const seen = new Set<string>();
  let scrapedAt: string | null = null;
  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    if (record.cardSet !== "Radiance") continue;
    if (typeof record.cardCode !== "string" || typeof record.name !== "string" || typeof record.cardNumber !== "string") continue;
    const rarity = typeof record.rarity === "string" && RARITIES.has(record.rarity) ? record.rarity : null;
    if (!rarity) continue;
    const number = radianceCatalogNumber(record.cardNumber);
    if (!number || seen.has(record.cardCode)) continue;
    seen.add(record.cardCode);
    const domains = Array.isArray(record.domains) ? record.domains.filter((domain): domain is string => typeof domain === "string" && DOMAINS.has(domain)) : [];
    const image = typeof record.imageUrl === "string" && record.imageUrl.startsWith("https://") ? record.imageUrl : null;
    if (typeof record.scrapedAt === "string" && (!scrapedAt || record.scrapedAt > scrapedAt)) scrapedAt = record.scrapedAt;
    cards.push({ code: record.cardCode, name: record.name, set: "Radiance", number, rarity, domains, image });
  }
  cards.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }) || a.code.localeCompare(b.code));
  return { scrapedAt, cards };
}
