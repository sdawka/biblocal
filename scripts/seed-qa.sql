-- QA Environment Seed Data
-- Run with: npx wrangler d1 execute biblocal-qa-db --env qa --remote --file=scripts/seed-qa.sql

-- Clear existing data
DELETE FROM books;
DELETE FROM users;

-- QA Test User
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, type, created_at, updated_at)
VALUES (
  'qa-test-user',
  'qa@biblocal.test',
  'QA Tester',
  'San Francisco',
  10,
  '["Fiction", "History", "Science"]',
  '["Rare Books"]',
  'flexible',
  'person',
  unixepoch(),
  unixepoch()
);

-- Additional test users for matching
INSERT INTO users (id, email, name, city, radius_km, topics_curated, type, created_at, updated_at)
VALUES
  ('qa-user-2', 'jane@test.com', 'Jane Reader', 'San Francisco', 5, '["Fiction", "Poetry"]', 'person', unixepoch(), unixepoch()),
  ('qa-user-3', 'bob@test.com', 'Bob Collector', 'Oakland', 15, '["History", "Maps"]', 'person', unixepoch(), unixepoch()),
  ('qa-user-4', 'alice@test.com', 'Alice Lender', 'Berkeley', 8, '["Science", "Technology"]', 'person', unixepoch(), unixepoch());

-- Books for QA Test User
INSERT INTO books (id, user_id, title, author, isbn, status, cover_url, subjects, added_via, created_at, updated_at)
VALUES
  ('book-1', 'qa-test-user', 'Crime and Punishment', 'Fyodor Dostoevsky', '9780140449136', 'borrowable', 'https://covers.openlibrary.org/b/isbn/9780140449136-M.jpg', '["Fiction", "Russian Literature", "Psychology"]', 'manual', unixepoch(), unixepoch()),
  ('book-2', 'qa-test-user', 'The Brothers Karamazov', 'Fyodor Dostoevsky', '9780374528379', 'discussable', 'https://covers.openlibrary.org/b/isbn/9780374528379-M.jpg', '["Fiction", "Russian Literature", "Philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('book-3', 'qa-test-user', 'A Brief History of Time', 'Stephen Hawking', '9780553380163', 'visible', 'https://covers.openlibrary.org/b/isbn/9780553380163-M.jpg', '["Science", "Physics", "Cosmology"]', 'manual', unixepoch(), unixepoch()),
  ('book-4', 'qa-test-user', 'Sapiens', 'Yuval Noah Harari', '9780062316097', 'borrowable', 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg', '["History", "Anthropology"]', 'manual', unixepoch(), unixepoch()),
  ('book-5', 'qa-test-user', 'The Design of Everyday Things', 'Don Norman', '9780465050659', 'giftable', NULL, '["Design", "Psychology"]', 'manual', unixepoch(), unixepoch()),
  ('book-6', 'qa-test-user', 'Dune', 'Frank Herbert', '9780441172719', 'seeking-home', 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg', '["Science Fiction", "Fantasy"]', 'manual', unixepoch(), unixepoch());

-- Books for Jane (shelf twin potential)
INSERT INTO books (id, user_id, title, author, isbn, status, subjects, added_via, created_at, updated_at)
VALUES
  ('book-jane-1', 'qa-user-2', 'Crime and Punishment', 'Fyodor Dostoevsky', '9780140449136', 'discussable', '["Fiction", "Russian Literature"]', 'manual', unixepoch(), unixepoch()),
  ('book-jane-2', 'qa-user-2', 'War and Peace', 'Leo Tolstoy', '9780143039990', 'borrowable', '["Fiction", "Russian Literature"]', 'manual', unixepoch(), unixepoch()),
  ('book-jane-3', 'qa-user-2', 'Selected Poems', 'Emily Dickinson', '9780674032675', 'visible', '["Poetry"]', 'manual', unixepoch(), unixepoch());

-- Books for Bob (local source - has book QA user seeks)
INSERT INTO books (id, user_id, title, author, isbn, status, subjects, added_via, created_at, updated_at)
VALUES
  ('book-bob-1', 'qa-user-3', 'Dune', 'Frank Herbert', '9780441172719', 'borrowable', '["Science Fiction"]', 'manual', unixepoch(), unixepoch()),
  ('book-bob-2', 'qa-user-3', 'The Map Book', 'Peter Barber', '9780802714749', 'visible', '["History", "Maps", "Cartography"]', 'manual', unixepoch(), unixepoch());

-- Books for Alice (reading mentor - has books for discussion)
INSERT INTO books (id, user_id, title, author, isbn, status, subjects, added_via, created_at, updated_at)
VALUES
  ('book-alice-1', 'qa-user-4', 'A Brief History of Time', 'Stephen Hawking', '9780553380163', 'discussable', '["Science", "Physics"]', 'manual', unixepoch(), unixepoch()),
  ('book-alice-2', 'qa-user-4', 'The Innovators', 'Walter Isaacson', '9781476708706', 'borrowable', '["Technology", "History"]', 'manual', unixepoch(), unixepoch());

-- Bookstores
INSERT INTO users (id, email, name, city, type, address, neighborhood, specialties, created_at, updated_at)
VALUES
  ('store-1', 'citylights@test.com', 'City Lights Books', 'San Francisco', 'bookstore', '261 Columbus Ave', 'North Beach', '["Poetry", "Beat Literature", "Progressive Politics"]', unixepoch(), unixepoch()),
  ('store-2', 'greenapple@test.com', 'Green Apple Books', 'San Francisco', 'bookstore', '506 Clement St', 'Inner Richmond', '["Used Books", "New Books", "Local Authors"]', unixepoch(), unixepoch()),
  ('store-3', 'moes@test.com', 'Moes Books', 'Berkeley', 'bookstore', '2476 Telegraph Ave', 'Southside', '["Academic", "Used Books", "Art"]', unixepoch(), unixepoch());
