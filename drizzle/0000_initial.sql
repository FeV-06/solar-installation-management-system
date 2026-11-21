CREATE TABLE `Enquiry` (
	`id` text PRIMARY KEY NOT NULL,
	`customerName` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`systemType` text NOT NULL,
	`capacityKw` integer NOT NULL,
	`subsidyInterest` integer DEFAULT false NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
