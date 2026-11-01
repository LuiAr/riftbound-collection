import committed from "../data/saved-decks.json";
import { deckSnapshot, type DeckStore, type DeckVersion, type SavedDeck } from "./deck-records";

const STORAGE_KEY = "riftbound.saved-decks.v1";

function asStore(value: unknown): DeckStore {
  const source = value && typeof value === "object" ? value as Partial<DeckStore> : {};
  const decks = Array.isArray(source.decks) ? source.decks.filter(isDeck) : [];
  const versions: Record<string, DeckVersion[]> = {};
  if (source.versions && typeof source.versions === "object") {
    for (const [deckId, items] of Object.entries(source.versions)) {
      if (Array.isArray(items)) versions[deckId] = items.filter(isVersion);
    }
  }
  return { decks, versions };
}

function isDeck(value: unknown): value is SavedDeck {
  const deck = value as SavedDeck;
  return Boolean(deck && typeof deck.deckId === "string" && typeof deck.name === "string" && typeof deck.deckText === "string" && typeof deck.hideRunes === "boolean" && typeof deck.hideTokens === "boolean" && typeof deck.createdAt === "string" && typeof deck.updatedAt === "string");
}

function isVersion(value: unknown): value is DeckVersion {
  const version = value as DeckVersion;
  return Boolean(version && typeof version.versionId === "string" && typeof version.name === "string" && typeof version.deckText === "string" && typeof version.createdAt === "string" && version.snapshot && typeof version.snapshot === "object");
}

export function emptyDeckStore(): DeckStore {
  return asStore(committed);
}

export function readDeckStore(): DeckStore {
  if (typeof window === "undefined") return emptyDeckStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDeckStore();
    return asStore(JSON.parse(raw));
  } catch {
    return emptyDeckStore();
  }
}

function writeDeckStore(store: DeckStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listDecks(): SavedDeck[] {
  return [...readDeckStore().decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function versionsFor(deckId: string): DeckVersion[] {
  return readDeckStore().versions[deckId] ?? [];
}

export function saveLocalDeck(input: { deckId?: string; name: string; deckText: string; hideRunes: boolean; hideTokens: boolean }): SavedDeck {
  const name = input.name.trim();
  const deckText = input.deckText.trim();
  if (!name || name.length > 80) throw new Error("Enter a deck name of up to 80 characters.");
  if (!deckText || deckText.length > 20_000) throw new Error("Paste a deck list of up to 20,000 characters.");
  const store = readDeckStore();
  let now = new Date().toISOString();
  if (input.deckId) {
    const old = store.decks.find((deck) => deck.deckId === input.deckId);
    if (!old) throw new Error("Saved deck not found.");
    if (now <= old.updatedAt) now = new Date(Date.parse(old.updatedAt) + 1).toISOString();
    const versions = store.versions[old.deckId] ?? [];
    if (versions.length >= 50) throw new Error("This deck has reached 50 saved versions. Save the next revision as a new deck.");
    const nextVersions = versions.length
      ? versions
      : [{ versionId: old.updatedAt, name: old.name, deckText: old.deckText, createdAt: old.updatedAt, snapshot: deckSnapshot(old.name, old.deckText, true) }];
    const versionId = crypto.randomUUID();
    store.versions[old.deckId] = [{ versionId, name, deckText, createdAt: now, snapshot: deckSnapshot(name, deckText) }, ...nextVersions];
    const saved: SavedDeck = { ...old, name, deckText, hideRunes: input.hideRunes, hideTokens: input.hideTokens, updatedAt: now };
    store.decks = store.decks.map((deck) => deck.deckId === old.deckId ? saved : deck);
    writeDeckStore(store);
    return saved;
  }
  if (store.decks.length >= 30) throw new Error("You can save up to 30 decks. Delete one before adding another.");
  const deckId = crypto.randomUUID();
  const saved: SavedDeck = { deckId, name, deckText, hideRunes: input.hideRunes, hideTokens: input.hideTokens, createdAt: now, updatedAt: now };
  store.decks = [saved, ...store.decks];
  store.versions[deckId] = [{ versionId: crypto.randomUUID(), name, deckText, createdAt: now, snapshot: deckSnapshot(name, deckText) }];
  writeDeckStore(store);
  return saved;
}

export function deleteLocalDeck(deckId: string): boolean {
  const store = readDeckStore();
  if (!store.decks.some((deck) => deck.deckId === deckId)) return false;
  store.decks = store.decks.filter((deck) => deck.deckId !== deckId);
  delete store.versions[deckId];
  writeDeckStore(store);
  return true;
}

export function exportDeckStore(): string {
  return JSON.stringify(readDeckStore(), null, 2);
}

export function importDeckStore(text: string): DeckStore {
  const parsed = JSON.parse(text) as { decks?: unknown };
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.decks)) throw new Error("This file is not a saved-decks export.");
  const store = asStore(parsed);
  writeDeckStore(store);
  return store;
}
