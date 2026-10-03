import deckMetadata from "../data/deck-card-metadata.json";
import type { DisplayCard } from "./collection";

type Category = "cards" | "runes" | "tokens";
type Metadata = { fullName: string; type: string };
export type DeckMatch = { name: string; required: number; owned: number; missing: number; category: Category; card: DisplayCard };
export type DeckAnalysis = { matches: DeckMatch[]; unmatched: string[]; parsedLines: number };

const metadata = deckMetadata as Record<string, Metadata>;
const normalize = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
const normalizeCode = (value: string) => {
  const pieces = value.toLowerCase().replace(/\s/g, "").split("-");
  pieces[pieces.length - 1] = pieces[pieces.length - 1].replace(/^([a-z]*?)0+(?=\d)/, "$1");
  return pieces.join("-");
};
const cardCode = (card: DisplayCard) => card.code.match(/^([a-z]+-(?:sp\d+-)?[a-z]?\d+[a-z]?)(?:-|$)/i)?.[1];

export function analyzeDeck(input: string, cards: DisplayCard[], { hideRunes = true, hideTokens = true } = {}): DeckAnalysis {
  const byName = new Map<string, { fullName: string; quantity: number; type: string; token: boolean; card: DisplayCard }>();
  const byCode = new Map<string, string>();
  const shortNames = new Map<string, Set<string>>();
  for (const card of cards) {
    const info = metadata[card.code];
    const fullName = info?.fullName || card.name;
    const key = normalize(fullName);
    const previous = byName.get(key);
    byName.set(key, { fullName, quantity: (previous?.quantity ?? 0) + card.quantity, type: info?.type || "", token: (previous?.token ?? true) && /-t\d+/i.test(card.code), card: previous?.card ?? card });
    const code = cardCode(card);
    if (code) byCode.set(normalizeCode(code), key);
    const shortKey = normalize(card.name);
    const aliases = shortNames.get(shortKey) ?? new Set<string>();
    aliases.add(key);
    shortNames.set(shortKey, aliases);
  }

  let section: Category | "legend" = "cards";
  const requested = new Map<string, { name: string; required: number; category: Category }>();
  const unmatched: string[] = [];
  let parsedLines = 0;
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[•*\-]\s*/, "");
    if (!line || /^https?:\/\//i.test(line)) continue;
    const heading = line.replace(/[:：]\s*$/, "").replace(/\s*\(\d+\)$/, "").trim();
    if (/^(?:runes?|rune deck)$/i.test(heading)) { section = "runes"; continue; }
    if (/^(?:tokens?|token cards?)$/i.test(heading)) { section = "tokens"; continue; }
    if (/^legend$/i.test(heading)) { section = "legend"; continue; }
    if (/^(?:main\s*deck|mainboard|sideboard|side deck|champion|chosen champion|battlefields?|cards?)$/i.test(heading)) { section = "cards"; continue; }

    const prefix = line.match(/^(\d{1,2})\s*[x×]?\s+(.+)$/i) ?? line.match(/^(\d{1,2})[x×]\s*(.+)$/i);
    const suffix = !prefix && line.match(/^(.+?)\s+[x×]\s*(\d{1,2})$/i);
    const count = prefix ? Number(prefix[1]) : suffix ? Number(suffix[2]) : 1;
    if (!Number.isSafeInteger(count) || count < 1) { unmatched.push(raw.trim()); continue; }
    const description = (prefix ? prefix[2] : suffix ? suffix[1] : line).trim();
    const code = description.match(/\b[A-Z]{2,4}-(?:SP\d+-)?[RT]?\d+[a-z]?\b/i)?.[0];
    const name = (code ? description.replace(code, "") : description).replace(/^[\s()[\]{}\-–—|]+|[\s()[\]{}\-–—|]+$/g, "").trim();
    const nameKey = normalize(name);
    let key = byName.has(nameKey) ? nameKey : undefined;
    if (!key && code) key = byCode.get(normalizeCode(code));
    if (!key && section === "legend" && name.includes(",")) {
      const title = normalize(name.slice(name.lastIndexOf(",") + 1));
      if (byName.get(title)?.type === "Legend") key = title;
    }
    if (!key) {
      const aliases = shortNames.get(nameKey);
      if (aliases?.size === 1) key = [...aliases][0];
    }
    const known = key ? byName.get(key) : undefined;
    const category: Category = section === "runes" || known?.type === "Rune" || /\brune$/i.test(name) || /-R\d+/i.test(code ?? "") ? "runes"
      : section === "tokens" || known?.token || /\btoken\b/i.test(name) || /-T\d+/i.test(code ?? "") ? "tokens" : "cards";
    parsedLines++;
    if ((category === "runes" && hideRunes) || (category === "tokens" && hideTokens)) continue;
    if (!known || !key) { unmatched.push(raw.trim()); continue; }
    const previous = requested.get(key);
    requested.set(key, { name: previous?.name ?? (name || known.fullName), required: (previous?.required ?? 0) + count, category });
  }

  const matches = [...requested].map(([key, { name, required, category }]) => {
    const matched = byName.get(key)!;
    const owned = matched.quantity;
    return { name, required, owned: Math.min(owned, required), missing: Math.max(0, required - owned), category, card: matched.card };
  });
  return { matches, unmatched, parsedLines };
}

export function missingList(matches: DeckMatch[]): string {
  return matches.filter((item) => item.missing > 0).map((item) => `${item.missing}x ${item.name}`).join("\n");
}
