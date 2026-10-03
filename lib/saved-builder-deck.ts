import { cardsById, normalizeCard, type DeckEntry, type DeckProposal, type DeckSection } from "./deck-builder";

const sections = new Set<DeckSection>(["legend", "chosen", "main", "runes", "battlefields", "sideboard"]);

export function readBuilderDeck(name: string, text: string): DeckProposal | null {
  let section: DeckSection | null = null;
  const entries: DeckEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (sections.has(line as DeckSection)) { section = line as DeckSection; continue; }
    const match = line.match(/^(\d+) (.+)$/);
    if (!section || !match) return null;
    const cardId = normalizeCard(match[2]);
    if (!cardsById.has(cardId) || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) return null;
    entries.push({ cardId, quantity: Number(match[1]), section });
  }
  if (!["legend", "chosen", "main", "runes", "battlefields"].every((required) => entries.some((entry) => entry.section === required))) return null;
  return { name, entries, strategy: "", summary: "", referenceIds: [], replacements: [], limitations: [] };
}
