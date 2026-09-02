-- Remembers the originally-fetched (OpenLibrary) cover so a custom uploaded
-- cover can be reset back to it.
ALTER TABLE `books` ADD `fetched_cover_url` text;
