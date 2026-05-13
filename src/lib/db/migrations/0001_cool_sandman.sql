CREATE TABLE `idea_category_data` (
	`idea_id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`fields` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade
);
