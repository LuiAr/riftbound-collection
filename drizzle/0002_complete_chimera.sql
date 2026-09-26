CREATE TABLE `saved_decks` (
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`name` text NOT NULL,
	`deck_text` text NOT NULL,
	`hide_runes` integer NOT NULL,
	`hide_tokens` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `deck_id`)
);
