CREATE TABLE `collection_imports` (
	`user_id` text NOT NULL,
	`import_id` text NOT NULL,
	`headers_json` text NOT NULL,
	`version` integer NOT NULL,
	`imported_at` text NOT NULL,
	`source_name` text NOT NULL,
	PRIMARY KEY(`user_id`, `import_id`)
);
