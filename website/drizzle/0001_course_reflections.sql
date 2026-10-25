CREATE TABLE `course_notes` (
	`learner_id` text NOT NULL,
	`note_id` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`learner_id`, `note_id`),
	FOREIGN KEY (`learner_id`) REFERENCES `course_learners`(`id`) ON UPDATE no action ON DELETE cascade
);
