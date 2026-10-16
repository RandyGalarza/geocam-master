ALTER TABLE `photos` ADD `owner_id` text;
--> statement-breakpoint
ALTER TABLE `photos` ADD `client_id` text;
--> statement-breakpoint
ALTER TABLE `photos` ADD `updated_at` integer;
--> statement-breakpoint
ALTER TABLE `photos` ADD `remote_path` text;
--> statement-breakpoint
ALTER TABLE `photos` ADD `synced_at` integer;
--> statement-breakpoint
UPDATE `photos` SET `client_id` = 'legacy_' || `id`, `updated_at` = `created_at`;
--> statement-breakpoint
CREATE UNIQUE INDEX `photos_client_id_unique` ON `photos` (`client_id`);
--> statement-breakpoint
ALTER TABLE `albums` ADD `owner_id` text;
--> statement-breakpoint
DROP INDEX `albums_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_owner_name_unique` ON `albums` (`owner_id`, `name`);
