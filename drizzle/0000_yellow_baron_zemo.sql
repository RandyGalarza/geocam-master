CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_name_unique` ON `albums` (`name`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`uri` text NOT NULL,
	`source` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`accuracy` real,
	`coords_timestamp` integer,
	`created_at` integer NOT NULL,
	`album_id` text,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE set null
);
