CREATE TABLE `draft_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`upload_order_index` integer DEFAULT 0 NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_attachments_storage_path_unique` ON `draft_attachments` (`storage_path`);--> statement-breakpoint
CREATE INDEX `idx_draft_attachments_draft_id` ON `draft_attachments` (`draft_id`);--> statement-breakpoint
CREATE TABLE `draft_category_data` (
	`draft_id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`fields` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`submitter_id` text NOT NULL,
	`title` text,
	`description` text,
	`category` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`submitter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_drafts_submitter_id` ON `drafts` (`submitter_id`);--> statement-breakpoint
CREATE INDEX `idx_drafts_updated_at` ON `drafts` ("updated_at" DESC);