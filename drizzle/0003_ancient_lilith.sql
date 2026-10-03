CREATE TABLE `builder_calls` (
	`user_id` text NOT NULL,
	`call_id` text NOT NULL,
	`month` text NOT NULL,
	`reserved_ore` integer NOT NULL,
	`actual_ore` integer,
	`status` text NOT NULL,
	`result_json` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `call_id`)
);
--> statement-breakpoint
CREATE TABLE `builder_usage` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`reserved_ore` integer DEFAULT 0 NOT NULL,
	`spent_ore` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `month`)
);
