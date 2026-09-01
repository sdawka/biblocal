CREATE INDEX IF NOT EXISTS users_discovery_named_name_id_idx
  ON users (name, id)
  WHERE name IS NOT NULL AND trim(name) <> '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS books_discovery_visible_owner_created_id_idx
  ON books (user_id, created_at DESC, id DESC)
  WHERE visibility = 'visible';
