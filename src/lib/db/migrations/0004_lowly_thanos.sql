CREATE TABLE `clarification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`stage_when_requested` text NOT NULL,
	`question` text NOT NULL,
	`questioner_id` text NOT NULL,
	`requested_at` integer NOT NULL,
	`response` text,
	`responder_id` text,
	`responded_at` integer,
	`cancelled_at` integer,
	`cancelled_by_id` text,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`questioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_clarification_requests_idea_id` ON `clarification_requests` (`idea_id`);--> statement-breakpoint
CREATE TABLE `stage_transitions` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`stage` text NOT NULL,
	`action` text NOT NULL,
	`notes` text NOT NULL,
	`admin_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_stage_transitions_idea_id` ON `stage_transitions` (`idea_id`);--> statement-breakpoint
CREATE INDEX `idx_stage_transitions_idea_created` ON `stage_transitions` (`idea_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `ideas` ADD `active_clarification_id` text;