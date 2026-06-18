CREATE TABLE `book_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL REFERENCES `books`(`id`),
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`text` text NOT NULL,
	`visibility` text NOT NULL DEFAULT 'private',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `book_notes_book_id_idx` ON `book_notes` (`book_id`);
