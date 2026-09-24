import { env } from "cloudflare:workers";
import initialInventory from "../data/initial-inventory.json";
import { CARD_NEXUS_COLUMNS, type InventoryRow } from "./collection";

type Meta = { active_import_id: string; headers_json: string; version: number; imported_at: string };
export type CollectionSnapshot = { rows: InventoryRow[]; headers: string[]; version: number; importedAt: string | null };

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

export async function getCollection(userId: string): Promise<CollectionSnapshot> {
  const db = database();
  await seedIfOwner(db, userId);
  const meta = await db.prepare("SELECT active_import_id, headers_json, version, imported_at FROM collection_meta WHERE user_id = ?")
    .bind(userId).first<Meta>();
  if (!meta) return { rows: [], headers: CARD_NEXUS_COLUMNS, version: 0, importedAt: null };
  const result = await db.prepare("SELECT row_json FROM inventory_rows WHERE user_id = ? AND import_id = ? ORDER BY position")
    .bind(userId, meta.active_import_id).all<{ row_json: string }>();
  return { rows: result.results.map((item) => JSON.parse(item.row_json) as InventoryRow), headers: JSON.parse(meta.headers_json) as string[], version: meta.version, importedAt: meta.imported_at };
}

export async function replaceCollection(userId: string, rows: InventoryRow[], headers: string[], expectedVersion: number, sourceName: string): Promise<CollectionSnapshot | null> {
  const db = database();
  const importId = crypto.randomUUID();
  await stageRows(db, userId, importId, rows);
  const importedAt = new Date().toISOString();
  let applied = false;
  if (expectedVersion === 0) {
    const result = await db.prepare("INSERT OR IGNORE INTO collection_meta (user_id, active_import_id, headers_json, version, imported_at, source_name) VALUES (?, ?, ?, 1, ?, ?)")
      .bind(userId, importId, JSON.stringify(headers), importedAt, sourceName).run();
    applied = (result.meta.changes ?? 0) > 0;
  } else {
    const result = await db.prepare("UPDATE collection_meta SET active_import_id = ?, headers_json = ?, version = version + 1, imported_at = ?, source_name = ? WHERE user_id = ? AND version = ?")
      .bind(importId, JSON.stringify(headers), importedAt, sourceName, userId, expectedVersion).run();
    applied = (result.meta.changes ?? 0) > 0;
  }
  if (!applied) {
    await db.prepare("DELETE FROM inventory_rows WHERE user_id = ? AND import_id = ?").bind(userId, importId).run();
    return null;
  }
  await db.prepare("DELETE FROM inventory_rows WHERE user_id = ? AND import_id <> ?").bind(userId, importId).run();
  return { rows, headers, version: expectedVersion + 1, importedAt };
}
