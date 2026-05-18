-- QA Scenario: Minimal (Fast Reset)
-- Tests: Basic shelf operations, quick iteration
--
-- Just the QA user with a couple books. Fast to load, easy to reason about.

DELETE FROM connection_requests;
DELETE FROM books;
DELETE FROM users;

INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES (
  'qa-test-user',
  'qa@biblocal.test',
  'QA Tester',
  'Montreal',
  5,
  45.5017,
  -73.5673,
  'city',
  'person',
  unixepoch(),
  unixepoch()
);

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, added_via, created_at, updated_at)
VALUES
  ('book-1', 'qa-test-user', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0441172717-M.jpg', 'manual', unixepoch(), unixepoch()),
  ('book-2', 'qa-test-user', 'Neuromancer', 'William Gibson', '9780441569595', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0441569595-M.jpg', 'manual', unixepoch(), unixepoch());
