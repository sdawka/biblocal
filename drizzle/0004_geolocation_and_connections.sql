-- Add geolocation columns to users
ALTER TABLE users ADD COLUMN latitude REAL;
ALTER TABLE users ADD COLUMN longitude REAL;
ALTER TABLE users ADD COLUMN location_precision TEXT DEFAULT 'city';

-- Add contact fields to users
ALTER TABLE users ADD COLUMN contact_method TEXT;
ALTER TABLE users ADD COLUMN contact_value TEXT;
ALTER TABLE users ADD COLUMN contact_visibility TEXT DEFAULT 'hidden';

-- Connection requests table
CREATE TABLE connection_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  responded_at INTEGER,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Index for efficient queries
CREATE INDEX idx_connection_requests_to_user ON connection_requests(to_user_id, status);
CREATE INDEX idx_connection_requests_from_user ON connection_requests(from_user_id);
