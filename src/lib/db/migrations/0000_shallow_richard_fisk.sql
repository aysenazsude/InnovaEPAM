CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_storage_path_unique` ON `attachments` (`storage_path`);--> statement-breakpoint
CREATE INDEX `idx_attachments_idea_id` ON `attachments` (`idea_id`);--> statement-breakpoint
CREATE TABLE `idea_categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`numeric_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submitter_id` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`admin_comment` text,
	`evaluating_admin_id` text,
	`evaluated_at` integer,
	FOREIGN KEY (`submitter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluating_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ideas_numeric_id_unique` ON `ideas` (`numeric_id`);--> statement-breakpoint
CREATE INDEX `idx_ideas_submitter_id` ON `ideas` (`submitter_id`);--> statement-breakpoint
CREATE INDEX `idx_ideas_status` ON `ideas` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ideas_submitted_at` ON `ideas` ("submitted_at" DESC);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'submitter' NOT NULL,
	`failed_login_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
INSERT INTO `idea_categories` (`slug`, `display_name`) VALUES
  ('technical_innovation', 'Technical Innovation'),
  ('process_improvement', 'Process Improvement'),
  ('client_solution', 'Client Solution'),
  ('product_enhancement', 'Product Enhancement'),
  ('other', 'Other');