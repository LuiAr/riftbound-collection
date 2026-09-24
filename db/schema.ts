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

export const bootstrapOwner = sqliteTable("bootstrap_owner", {
  id: integer("id").primaryKey(), userId: text("user_id").notNull(),
});
