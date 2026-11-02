import type { InventoryRow } from "./collection";

export type CollectionVersion = { importId: string; version: number; importedAt: string | null; sourceName: string };
export type CollectionSnapshot = { rows: InventoryRow[]; headers: string[]; version: number; importedAt: string | null; importId: string | null; sourceName: string | null };

export type GeneratedCollection = { currentId: string; snapshots: CollectionSnapshot[] };
