-- Dedup existing connection_requests so a unique index can be created safely.
-- Keep the earliest row (lowest rowid) per ordered (from_user_id, to_user_id)
-- pair; delete the rest.
DELETE FROM connection_requests
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM connection_requests GROUP BY from_user_id, to_user_id
);
--> statement-breakpoint
-- Enforce one request per ordered pair at the DB level so concurrent
-- check-then-insert races can no longer create duplicate pending rows.
CREATE UNIQUE INDEX IF NOT EXISTS connection_requests_pair_unique ON connection_requests (from_user_id, to_user_id);
