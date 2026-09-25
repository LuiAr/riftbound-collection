import { env } from "cloudflare:workers";
import initialInventory from "../data/initial-inventory.json";
import { CARD_NEXUS_COLUMNS, type InventoryRow } from "./collection";

type Meta = { active_import_id: string; headers_json: string; version: number; imported_at: string; source_name: string };
type ImportMeta = { import_id: string; headers_json: string; version: number; imported_at: string; source_name: string };
export type CollectionVersion = { importId: string; version: number; importedAt: string; sourceName: string };
export type CollectionSnapshot = { rows: InventoryRow[]; headers: string[]; version: number; importedAt: string | null; importId: string | null; sourceName: string | null };

function database(): D1Database {
  if (!env.DB) throw new Error("Collection storage is unavailable.");
  return env.DB;
}

async function stageRows(db: D1Database, userId: string, importId: string, rows: InventoryRow[]) {
  for (let start = 0; start < rows.length; start += 70) {
    const statements = rows.slice(start, start + 70).map((row, offset) => db.prepare(
      "INSERT OR REPLACE INTO inventory_rows (user_id, import_id, position, row_json) VALUES (?, ?, ?, ?)"
    ).bind(userId, importId, start + offset, JSON.stringify(row)));
    await db.batch(statements);
  }
}

async function seedIfOwner(db: D1Database, userId: string) {
  await db.prepare("INSERT OR IGNORE INTO bootstrap_owner (id, user_id) VALUES (1, ?)").bind(userId).run();
  const owner = await db.prepare("SELECT user_id FROM bootstrap_owner WHERE id = 1").first<{ user_id: string }>();
  if (owner?.user_id !== userId) return;
  const existing = await db.prepare("SELECT user_id FROM collection_meta WHERE user_id = ?").bind(userId).first();
  if (existing) return;
  const importId = "initial-card-nexus-export";
  await stageRows(db, userId, importId, initialInventory.rows);
  await db.prepare("INSERT OR IGNORE INTO collection_meta (user_id, active_import_id, headers_json, version, imported_at, source_name) VALUES (?, ?, ?, 1, ?, ?)")
    .bind(userId, importId, JSON.stringify(initialInventory.headers), "2026-09-24T14:26:10Z", "Card Nexus export").run();
}

async function recordCurrentImport(db: D1Database, userId: string) {
  // Existing Sites have only collection_meta. Preserve their current import on first read.
  await db.prepare("INSERT OR IGNORE INTO collection_imports (user_id, import_id, headers_json, version, imported_at, source_name) SELECT user_id, active_import_id, headers_json, version, imported_at, source_name FROM collection_meta WHERE user_id = ?")
    .bind(userId).run();
}

async function readRows(db: D1Database, userId: string, importId: string): Promise<InventoryRow[]> {
  const result = await db.prepare("SELECT row_json FROM inventory_rows WHERE user_id = ? AND import_id = ? ORDER BY position")
    .bind(userId, importId).all<{ row_json: string }>();
  return result.results.map((item) => JSON.parse(item.row_json) as InventoryRow);
}

export async function getCollection(userId: string): Promise<CollectionSnapshot> {
  const db = database();
  await seedIfOwner(db, userId);
  await recordCurrentImport(db, userId);
  const meta = await db.prepare("SELECT active_import_id, headers_json, version, imported_at, source_name FROM collection_meta WHERE user_id = ?")
    .bind(userId).first<Meta>();
  if (!meta) return { rows: [], headers: CARD_NEXUS_COLUMNS, version: 0, importedAt: null, importId: null, sourceName: null };
  return { rows: await readRows(db, userId, meta.active_import_id), headers: JSON.parse(meta.headers_json) as string[], version: meta.version, importedAt: meta.imported_at, importId: meta.active_import_id, sourceName: meta.source_name };
}

export async function getCollectionHistory(userId: string): Promise<CollectionVersion[]> {
  const db = database();
  await seedIfOwner(db, userId);
  await recordCurrentImport(db, userId);
  const result = await db.prepare("SELECT import_id, version, imported_at, source_name FROM collection_imports WHERE user_id = ? ORDER BY version DESC")
    .bind(userId).all<Omit<ImportMeta, "headers_json">>();
  return result.results.map((item) => ({ importId: item.import_id, version: item.version, importedAt: item.imported_at, sourceName: item.source_name }));
}

export async function getCollectionAt(userId: string, importId: string): Promise<CollectionSnapshot | null> {
  const db = database();
  await recordCurrentImport(db, userId);
  const meta = await db.prepare("SELECT import_id, headers_json, version, imported_at, source_name FROM collection_imports WHERE user_id = ? AND import_id = ?")
    .bind(userId, importId).first<ImportMeta>();
  if (!meta) return null;
  return { rows: await readRows(db, userId, importId), headers: JSON.parse(meta.headers_json) as string[], version: meta.version, importedAt: meta.imported_at, importId, sourceName: meta.source_name };
}

export async function replaceCollection(userId: string, rows: InventoryRow[], headers: string[], expectedVersion: number, sourceName: string): Promise<CollectionSnapshot | null> {
  const db = database();
  const importId = crypto.randomUUID();
  await stageRows(db, userId, importId, rows);
  const importedAt = new Date().toISOString();
  let update: D1PreparedStatement;
  if (expectedVersion === 0) {
    update = db.prepare("INSERT OR IGNORE INTO collection_meta (user_id, active_import_id, headers_json, version, imported_at, source_name) VALUES (?, ?, ?, 1, ?, ?)")
      .bind(userId, importId, JSON.stringify(headers), importedAt, sourceName);
  } else {
    update = db.prepare("UPDATE collection_meta SET active_import_id = ?, headers_json = ?, version = version + 1, imported_at = ?, source_name = ? WHERE user_id = ? AND version = ?")
      .bind(importId, JSON.stringify(headers), importedAt, sourceName, userId, expectedVersion);
  }
  const [result] = await db.batch([
    update,
    db.prepare("INSERT INTO collection_imports (user_id, import_id, headers_json, version, imported_at, source_name) SELECT user_id, active_import_id, headers_json, version, imported_at, source_name FROM collection_meta WHERE user_id = ? AND active_import_id = ?")
      .bind(userId, importId),
  ]);
  const applied = (result.meta.changes ?? 0) > 0;
  if (!applied) {
    await db.prepare("DELETE FROM inventory_rows WHERE user_id = ? AND import_id = ?").bind(userId, importId).run();
    return null;
  }
  return { rows, headers, version: expectedVersion + 1, importedAt, importId, sourceName };
}
