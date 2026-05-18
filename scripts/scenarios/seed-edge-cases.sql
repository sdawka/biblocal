-- QA Scenario: Edge Cases
-- Tests edge conditions that might break things
--
-- Users:
--   qa-test-user      - Main test user (Montreal, has location)
--   qa-seeker-only    - Only seeking books, none owned
--   qa-private-only   - All books are private
--   qa-no-location    - No lat/lng set
--   qa-edge-of-radius - Exactly 5km from main user
--   qa-rate-limited   - Has sent 5 connection requests today
--   qa-declined       - Was declined within last 30 days
--   qa-bookstore      - Bookstore entity, not a person
--   qa-other-city     - User in Toronto (different city)

DELETE FROM connection_requests;
DELETE FROM books;
DELETE FROM users;

-- Main QA user (Montreal center)
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision,
                   contact_method, contact_value, contact_visibility, type, created_at, updated_at)
VALUES (
  'qa-test-user', 'qa@biblocal.test', 'QA Tester', 'Montreal', 5,
  45.5017, -73.5673, 'city',
  'email', 'qa@biblocal.test', 'on-request',
  'person', unixepoch(), unixepoch()
);

-- Seeker only: has books but only "seeking" ownership
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES ('qa-seeker-only', 'seeker@test.com', 'The Seeker', 'Montreal', 5,
        45.5087, -73.5540, 'approximate', 'person', unixepoch(), unixepoch());

-- Private only: has books but all private
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES ('qa-private-only', 'private@test.com', 'Private Collector', 'Montreal', 5,
        45.5127, -73.5542, 'approximate', 'person', unixepoch(), unixepoch());

-- No location: no lat/lng or city
INSERT INTO users (id, email, name, type, created_at, updated_at)
VALUES ('qa-no-location', 'noloc@test.com', 'Location Unknown', 'person', unixepoch(), unixepoch());

-- Edge of radius: exactly 5km from main user (45.5017, -73.5673)
-- 5km north: approximately 45.5467, -73.5673
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES ('qa-edge-of-radius', 'edge@test.com', 'Edge Case', 'Montreal', 5,
        45.5467, -73.5673, 'exact', 'person', unixepoch(), unixepoch());

-- Rate limited: will have 5 connection requests (inserted below)
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision,
                   contact_method, contact_value, contact_visibility, type, created_at, updated_at)
VALUES ('qa-rate-limited', 'ratelimit@test.com', 'Rate Limited', 'Montreal', 5,
        45.4956, -73.5690, 'approximate',
        'email', 'ratelimit@test.com', 'on-request',
        'person', unixepoch(), unixepoch());

-- Declined: has a declined connection from main user (inserted below)
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES ('qa-declined', 'declined@test.com', 'Previously Declined', 'Montreal', 5,
        45.5234, -73.5826, 'approximate', 'person', unixepoch(), unixepoch());

-- Bookstore: entity type is bookstore
INSERT INTO users (id, email, name, city, type, latitude, longitude, location_precision,
                   address, neighborhood, specialties, created_at, updated_at)
VALUES ('qa-bookstore', 'store@test.com', 'Test Bookshop', 'Montreal', 'bookstore',
        45.5087, -73.5640, 'exact',
        '123 Test St', 'Downtown',
        '["literary fiction", "philosophy", "used books"]',
        unixepoch(), unixepoch());

-- Other city: user in Toronto
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES ('qa-other-city', 'toronto@test.com', 'Toronto Reader', 'Toronto', 5,
        43.6532, -79.3832, 'city', 'person', unixepoch(), unixepoch());

-- Dummy users for rate limit testing (targets of qa-rate-limited's requests)
INSERT INTO users (id, email, name, type, created_at, updated_at)
VALUES
  ('dummy-1', 'dummy1@test.com', 'Dummy 1', 'person', unixepoch(), unixepoch()),
  ('dummy-2', 'dummy2@test.com', 'Dummy 2', 'person', unixepoch(), unixepoch()),
  ('dummy-3', 'dummy3@test.com', 'Dummy 3', 'person', unixepoch(), unixepoch()),
  ('dummy-4', 'dummy4@test.com', 'Dummy 4', 'person', unixepoch(), unixepoch()),
  ('dummy-5', 'dummy5@test.com', 'Dummy 5', 'person', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- BOOKS
-- ═══════════════════════════════════════════════════════════════════════════

-- Main user: normal books
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-main-1', 'qa-test-user', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('book-main-2', 'qa-test-user', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'seeking', '["borrowable"]', 'manual', unixepoch(), unixepoch());

-- Seeker only: only seeking books
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-seek-1', 'qa-seeker-only', 'Neuromancer', 'William Gibson', '9780441569595', 'visible', 'seeking', '[]', 'manual', unixepoch(), unixepoch()),
  ('book-seek-2', 'qa-seeker-only', 'Snow Crash', 'Neal Stephenson', '9780553380958', 'visible', 'seeking', '[]', 'manual', unixepoch(), unixepoch());

-- Private only: all private
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-priv-1', 'qa-private-only', 'The Prince', 'Machiavelli', '9780140449150', 'private', 'have', '[]', 'manual', unixepoch(), unixepoch()),
  ('book-priv-2', 'qa-private-only', 'Meditations', 'Marcus Aurelius', '9780140449136', 'private', 'have', '[]', 'manual', unixepoch(), unixepoch());

-- Edge of radius: has same book as main user (match potential)
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-edge-1', 'qa-edge-of-radius', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch());

-- Bookstore: has books for matching
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-store-1', 'qa-bookstore', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('book-store-2', 'qa-bookstore', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch());

-- Toronto user: has books but different city
INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  ('book-tor-1', 'qa-other-city', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- CONNECTION REQUESTS (for edge cases)
-- ═══════════════════════════════════════════════════════════════════════════

-- Rate limited user: 5 pending requests sent today
INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at)
VALUES
  ('req-rl-1', 'qa-rate-limited', 'dummy-1', 'pending', unixepoch()),
  ('req-rl-2', 'qa-rate-limited', 'dummy-2', 'pending', unixepoch()),
  ('req-rl-3', 'qa-rate-limited', 'dummy-3', 'pending', unixepoch()),
  ('req-rl-4', 'qa-rate-limited', 'dummy-4', 'pending', unixepoch()),
  ('req-rl-5', 'qa-rate-limited', 'dummy-5', 'pending', unixepoch());

-- Declined user: main user declined their request recently
INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at)
VALUES
  ('req-dec-1', 'qa-declined', 'qa-test-user', 'declined', unixepoch() - 86400, unixepoch() - 43200);
