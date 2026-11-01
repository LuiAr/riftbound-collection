import { builderCards } from "./deck-builder";
import { ADVISOR_VERSION, analyzeStrategy, parseAdvisorDeck } from "./deck-advisor";

export type DeckVersion = { versionId: string; name: string; deckText: string; createdAt: string; snapshot: { advisorVersion: string; cardIds: string[]; analysis: ReturnType<typeof analyzeStrategy> | null; legacy?: boolean } };
export function deckSnapshot(name: string, text: string, legacy = false): DeckVersion["snapshot"] {
  const parsed = parseAdvisorDeck(name, text);
  return { advisorVersion: ADVISOR_VERSION, cardIds: builderCards.map((card) => card.id), analysis: parsed.unmatched.length ? null : analyzeStrategy(parsed.deck), ...(legacy ? { legacy: true } : {}) };
}

export type SavedDeck = {
  deckId: string; name: string; deckText: string; hideRunes: boolean; hideTokens: boolean;
  createdAt: string; updatedAt: string;
};

export type DeckStore = { decks: SavedDeck[]; versions: Record<string, DeckVersion[]> };
