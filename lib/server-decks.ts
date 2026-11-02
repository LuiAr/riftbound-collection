import { env } from "cloudflare:workers";
import { deckSnapshot, type DeckVersion, type SavedDeck } from "./deck-records";

export type { DeckVersion, SavedDeck };
export { deckSnapshot };
export async function getDeckVersions(userId: string, deckId: string): Promise<DeckVersion[]> {
  const result = await database().prepare("SELECT version_id, name, deck_text, snapshot_json, created_at FROM deck_versions WHERE user_id = ? AND deck_id = ? ORDER BY created_at DESC, version_id DESC").bind(userId, deckId).all<{ version_id: string; name: string; deck_text: string; snapshot_json: string; created_at: string }>();
  return result.results.map(r => ({ versionId: r.version_id, name: r.name, deckText: r.deck_text, createdAt: r.created_at, snapshot: JSON.parse(r.snapshot_json) }));
}

type SavedDeckRow = {
  deck_id: string; name: string; deck_text: string; hide_runes: number; hide_tokens: number;
  created_at: string; updated_at: string;
};

function database(): D1Database {
  if (!env.DB) throw new Error("Deck storage is unavailable.");
  return env.DB;
}

function toDeck(row: SavedDeckRow): SavedDeck {
  return {
    deckId: row.deck_id, name: row.name, deckText: row.deck_text,
    hideRunes: Boolean(row.hide_runes), hideTokens: Boolean(row.hide_tokens),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listSavedDecks(userId: string): Promise<SavedDeck[]> {
  const result = await database().prepare("SELECT deck_id, name, deck_text, hide_runes, hide_tokens, created_at, updated_at FROM saved_decks WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(userId).all<SavedDeckRow>();
  return result.results.map(toDeck);
}

export async function saveDeck(userId: string, input: { deckId?: string; name: string; deckText: string; hideRunes: boolean; hideTokens: boolean }): Promise<SavedDeck | null> {
  const db = database();
  let now = new Date().toISOString();
  if (input.deckId) {
    const old = await db.prepare("SELECT deck_id, name, deck_text, hide_runes, hide_tokens, created_at, updated_at FROM saved_decks WHERE user_id = ? AND deck_id = ?").bind(userId, input.deckId).first<SavedDeckRow>();
    if (!old) return null;
    if (now <= old.updated_at) now = new Date(Date.parse(old.updated_at) + 1).toISOString();
    const versions = await getDeckVersions(userId, input.deckId);
    if (versions.length >= 50) throw new Error("This deck has reached 50 saved versions. Save the next revision as a new deck.");
    const statements = [];
    if (!versions.length) statements.push(db.prepare("INSERT OR IGNORE INTO deck_versions (user_id, deck_id, version_id, name, deck_text, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(userId, input.deckId, old.updated_at, old.name, old.deck_text, JSON.stringify(deckSnapshot(old.name, old.deck_text, true)), old.updated_at));
    statements.push(db.prepare("UPDATE saved_decks SET name = ?, deck_text = ?, hide_runes = ?, hide_tokens = ?, updated_at = ? WHERE user_id = ? AND deck_id = ? AND updated_at = ?").bind(input.name, input.deckText, Number(input.hideRunes), Number(input.hideTokens), now, userId, input.deckId, old.updated_at));
    statements.push(db.prepare("INSERT INTO deck_versions (user_id, deck_id, version_id, name, deck_text, snapshot_json, created_at) SELECT user_id, deck_id, ?, name, deck_text, ?, updated_at FROM saved_decks WHERE user_id = ? AND deck_id = ? AND updated_at = ? AND changes() > 0").bind(crypto.randomUUID(), JSON.stringify(deckSnapshot(input.name, input.deckText)), userId, input.deckId, now));
    const batch = await db.batch(statements);
    const result = batch[versions.length ? 0 : 1];
    if (!result.meta.changes) throw new Error("The deck changed in another session. Reopen it before saving.");
    if (!result.meta.changes) return null;
    const row = await db.prepare("SELECT deck_id, name, deck_text, hide_runes, hide_tokens, created_at, updated_at FROM saved_decks WHERE user_id = ? AND deck_id = ?")
      .bind(userId, input.deckId).first<SavedDeckRow>();
    return row ? toDeck(row) : null;
  }
  const count = await db.prepare("SELECT COUNT(*) AS total FROM saved_decks WHERE user_id = ?").bind(userId).first<{ total: number }>();
  if ((count?.total ?? 0) >= 30) throw new Error("You can save up to 30 decks. Delete one before adding another.");
  const deckId = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO saved_decks (user_id, deck_id, name, deck_text, hide_runes, hide_tokens, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(userId, deckId, input.name, input.deckText, Number(input.hideRunes), Number(input.hideTokens), now, now),
    db.prepare("INSERT INTO deck_versions (user_id, deck_id, version_id, name, deck_text, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(userId, deckId, crypto.randomUUID(), input.name, input.deckText, JSON.stringify(deckSnapshot(input.name, input.deckText)), now),
  ]);
  return { deckId, name: input.name, deckText: input.deckText, hideRunes: input.hideRunes, hideTokens: input.hideTokens, createdAt: now, updatedAt: now };
}

export async function deleteDeck(userId: string, deckId: string): Promise<boolean> {
  const [result] = await database().batch([
    database().prepare("DELETE FROM saved_decks WHERE user_id = ? AND deck_id = ?").bind(userId, deckId),
    database().prepare("DELETE FROM deck_versions WHERE user_id = ? AND deck_id = ?").bind(userId, deckId),
  ]);
  return (result.meta.changes ?? 0) > 0;
}
