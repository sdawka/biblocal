-- Add new three-dimension model columns
ALTER TABLE `books` ADD `visibility` text NOT NULL DEFAULT 'visible';--> statement-breakpoint
ALTER TABLE `books` ADD `ownership` text NOT NULL DEFAULT 'have';--> statement-breakpoint
ALTER TABLE `books` ADD `intents` text NOT NULL DEFAULT '[]';--> statement-breakpoint

-- Migrate existing status values to new columns
-- 'private' -> visibility='private', ownership='have', intents=[]
UPDATE `books` SET visibility = 'private', ownership = 'have', intents = '[]' WHERE status = 'private';--> statement-breakpoint

-- 'visible' -> visibility='visible', ownership='have', intents=[]
UPDATE `books` SET visibility = 'visible', ownership = 'have', intents = '[]' WHERE status = 'visible';--> statement-breakpoint

-- 'borrowable' -> visibility='visible', ownership='have', intents=['borrowable']
UPDATE `books` SET visibility = 'visible', ownership = 'have', intents = '["borrowable"]' WHERE status = 'borrowable';--> statement-breakpoint

-- 'discussable' -> visibility='visible', ownership='have', intents=['discussable']
UPDATE `books` SET visibility = 'visible', ownership = 'have', intents = '["discussable"]' WHERE status = 'discussable';--> statement-breakpoint

-- 'giftable' -> visibility='visible', ownership='have', intents=['giftable']
UPDATE `books` SET visibility = 'visible', ownership = 'have', intents = '["giftable"]' WHERE status = 'giftable';--> statement-breakpoint

-- 'class-resource' -> visibility='visible', ownership='have', intents=['class-resource']
UPDATE `books` SET visibility = 'visible', ownership = 'have', intents = '["class-resource"]' WHERE status = 'class-resource';--> statement-breakpoint

-- 'seeking-home' -> visibility='visible', ownership='seeking', intents=[]
UPDATE `books` SET visibility = 'visible', ownership = 'seeking', intents = '[]' WHERE status = 'seeking-home';
