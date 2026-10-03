CREATE TABLE `builder_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`call_id` text NOT NULL,
	`stage` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_builder_events_user_call` ON `builder_events` (`user_id`,`call_id`,`id`);--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `input_json` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `context_json` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `provider_id` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `conversation_id` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `raw_output` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `error_message` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `stage` text DEFAULT 'inventory' NOT NULL;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `kept_deck_id` text;--> statement-breakpoint
ALTER TABLE `builder_calls` ADD `lease_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_builder_calls_user_inbox` ON `builder_calls` (`user_id`,`deleted_at`,`created_at`);