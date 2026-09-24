CREATE TABLE `bootstrap_owner` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collection_meta` (
	`user_id` text PRIMARY KEY NOT NULL,
	`active_import_id` text NOT NULL,
	`headers_json` text NOT NULL,
	`version` integer NOT NULL,
	`imported_at` text NOT NULL,
	`source_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_rows` (
	`user_id` text NOT NULL,
	`import_id` text NOT NULL,
	`position` integer NOT NULL,
	`row_json` text NOT NULL,
	PRIMARY KEY(`user_id`, `import_id`, `position`)
);
