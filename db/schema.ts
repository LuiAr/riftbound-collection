import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const inventoryRows = sqliteTable("inventory_rows", {
  userId: text("user_id").notNull(), importId: text("import_id").notNull(),
  position: integer("position").notNull(), rowJson: text("row_json").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.importId, table.position] })]);

export const collectionMeta = sqliteTable("collection_meta", {
  userId: text("user_id").primaryKey(), activeImportId: text("active_import_id").notNull(),
  headersJson: text("headers_json").notNull(), version: integer("version").notNull(),
  importedAt: text("imported_at").notNull(), sourceName: text("source_name").notNull(),
});

export const collectionImports = sqliteTable("collection_imports", {
  userId: text("user_id").notNull(), importId: text("import_id").notNull(),
  headersJson: text("headers_json").notNull(), version: integer("version").notNull(),
  importedAt: text("imported_at").notNull(), sourceName: text("source_name").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.importId] })]);

export const bootstrapOwner = sqliteTable("bootstrap_owner", {
  id: integer("id").primaryKey(), userId: text("user_id").notNull(),
});

export const savedDecks = sqliteTable("saved_decks", {
  userId: text("user_id").notNull(), deckId: text("deck_id").notNull(),
  name: text("name").notNull(), deckText: text("deck_text").notNull(),
  hideRunes: integer("hide_runes", { mode: "boolean" }).notNull(),
  hideTokens: integer("hide_tokens", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.deckId] })]);

export const builderUsage = sqliteTable("builder_usage", {
  userId: text("user_id").notNull(), month: text("month").notNull(),
  reservedOre: integer("reserved_ore").notNull().default(0),
  spentOre: integer("spent_ore").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.month] })]);

export const builderCalls = sqliteTable("builder_calls", {
  userId: text("user_id").notNull(), callId: text("call_id").notNull(),
  month: text("month").notNull(), reservedOre: integer("reserved_ore").notNull(),
  actualOre: integer("actual_ore"), status: text("status").notNull(),
  resultJson: text("result_json"), createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.callId] })]);
