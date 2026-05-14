CREATE TABLE `evaluation_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`stage_transition_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`dimension` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_transition_id`) REFERENCES `stage_transitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evaluation_scores_transition_dimension` ON `evaluation_scores` (`stage_transition_id`,`dimension`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_scores_idea_id` ON `evaluation_scores` (`idea_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_scores_transition_id` ON `evaluation_scores` (`stage_transition_id`);