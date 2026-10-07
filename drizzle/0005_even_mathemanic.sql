CREATE TABLE `deck_versions` (
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`version_id` text NOT NULL,
	`name` text NOT NULL,
	`deck_text` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `deck_id`, `version_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_deck_versions_user_deck_created` ON `deck_versions` (`user_id`,`deck_id`,`created_at`);