CREATE TABLE `course_learners` (
	`id` text PRIMARY KEY NOT NULL,
	`last_lesson` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course_progress` (
	`learner_id` text NOT NULL,
	`item_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`learner_id`, `item_id`),
	FOREIGN KEY (`learner_id`) REFERENCES `course_learners`(`id`) ON UPDATE no action ON DELETE cascade
);
