CREATE TABLE `spotlight_picks` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`month_year` text NOT NULL,
	`pinned_at` integer NOT NULL,
	`pinned_by_admin_id` text NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pinned_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_spotlight_picks_month_year` ON `spotlight_picks` (`month_year`);
--> statement-breakpoint
CREATE INDEX `idx_spotlight_picks_idea_id` ON `spotlight_picks` (`idea_id`);
