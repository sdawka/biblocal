-- QA Scenario: Power User (Scale Testing)
-- Tests: Shelf pagination, filter performance, connection management, map markers
--
-- qa-power-user: 50 books, full profile, various intents
-- 2 incoming pending connection requests
-- 1 accepted connection
-- Multiple nearby users for dense map

DELETE FROM connection_requests;
DELETE FROM books;
DELETE FROM users;

-- Power user with full profile
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision,
                   topics_curated, topics_freeform, borrow_style, current_obsessions,
                   contact_method, contact_value, contact_visibility, type, created_at, updated_at)
VALUES (
  'qa-test-user', 'qa@biblocal.test', 'Power Reader', 'Montreal', 10,
  45.5017, -73.5673, 'approximate',
  '["literary fiction", "philosophy", "science fiction", "history", "psychology"]',
  '["completionist reader", "margin annotator", "book club organizer"]',
  'careful with spines, notes welcome, flexible returns',
  'building the perfect reading list, rare first editions',
  'email', 'power@biblocal.test', 'on-request',
  'person', unixepoch(), unixepoch()
);

-- Users who sent connection requests (pending)
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision,
                   contact_method, contact_value, contact_visibility, type, created_at, updated_at)
VALUES
  ('user-requester-1', 'req1@test.com', 'Alice Requester', 'Montreal', 5,
   45.5087, -73.5540, 'approximate',
   'email', 'alice@test.com', 'on-request', 'person', unixepoch(), unixepoch()),
  ('user-requester-2', 'req2@test.com', 'Bob Requester', 'Montreal', 5,
   45.5127, -73.5642, 'approximate',
   'social', '@bob_reads', 'on-request', 'person', unixepoch(), unixepoch());

-- User with accepted connection
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision,
                   contact_method, contact_value, contact_visibility, type, created_at, updated_at)
VALUES (
  'user-connected', 'conn@test.com', 'Carol Connected', 'Montreal', 5,
  45.4956, -73.5690, 'approximate',
  'email', 'carol@test.com', 'on-request', 'person', unixepoch(), unixepoch()
);

-- Additional nearby users for map density
INSERT INTO users (id, email, name, city, radius_km, latitude, longitude, location_precision, type, created_at, updated_at)
VALUES
  ('user-nearby-1', 'near1@test.com', 'Nearby One', 'Montreal', 5, 45.5067, -73.5580, 'approximate', 'person', unixepoch(), unixepoch()),
  ('user-nearby-2', 'near2@test.com', 'Nearby Two', 'Montreal', 5, 45.5117, -73.5720, 'approximate', 'person', unixepoch(), unixepoch()),
  ('user-nearby-3', 'near3@test.com', 'Nearby Three', 'Montreal', 5, 45.4987, -73.5610, 'approximate', 'person', unixepoch(), unixepoch()),
  ('user-nearby-4', 'near4@test.com', 'Nearby Four', 'Montreal', 5, 45.5147, -73.5490, 'approximate', 'person', unixepoch(), unixepoch()),
  ('user-nearby-5', 'near5@test.com', 'Nearby Five', 'Montreal', 5, 45.4927, -73.5750, 'approximate', 'person', unixepoch(), unixepoch());

-- Bookstores for map variety
INSERT INTO users (id, email, name, city, type, latitude, longitude, address, neighborhood, specialties, created_at, updated_at)
VALUES
  ('store-1', 's1@test.com', 'Chapter One', 'Montreal', 'bookstore', 45.5047, -73.5620,
   '100 Main St', 'Downtown', '["literary fiction", "new releases"]', unixepoch(), unixepoch()),
  ('store-2', 's2@test.com', 'The Dusty Shelf', 'Montreal', 'bookstore', 45.5157, -73.5780,
   '200 Oak Ave', 'Mile End', '["used books", "rare editions"]', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- POWER USER'S BOOKS (50 books with variety)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, subjects, added_via, created_at, updated_at)
VALUES
  -- Borrowable (15)
  ('b01', 'qa-test-user', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b02', 'qa-test-user', 'Foundation', 'Isaac Asimov', '9780553293357', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b03', 'qa-test-user', 'Neuromancer', 'William Gibson', '9780441569595', 'visible', 'have', '["borrowable"]', '["cyberpunk"]', 'manual', unixepoch(), unixepoch()),
  ('b04', 'qa-test-user', 'Snow Crash', 'Neal Stephenson', '9780553380958', 'visible', 'have', '["borrowable"]', '["cyberpunk"]', 'manual', unixepoch(), unixepoch()),
  ('b05', 'qa-test-user', 'The Left Hand of Darkness', 'Ursula K. Le Guin', '9780441478125', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b06', 'qa-test-user', 'Hyperion', 'Dan Simmons', '9780553283686', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b07', 'qa-test-user', 'Enders Game', 'Orson Scott Card', '9780812550702', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b08', 'qa-test-user', 'The Martian', 'Andy Weir', '9780553418026', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b09', 'qa-test-user', '1984', 'George Orwell', '9780451524935', 'visible', 'have', '["borrowable"]', '["dystopia"]', 'manual', unixepoch(), unixepoch()),
  ('b10', 'qa-test-user', 'Brave New World', 'Aldous Huxley', '9780060850524', 'visible', 'have', '["borrowable"]', '["dystopia"]', 'manual', unixepoch(), unixepoch()),
  ('b11', 'qa-test-user', 'Fahrenheit 451', 'Ray Bradbury', '9781451673319', 'visible', 'have', '["borrowable"]', '["dystopia"]', 'manual', unixepoch(), unixepoch()),
  ('b12', 'qa-test-user', 'Slaughterhouse-Five', 'Kurt Vonnegut', '9780440180296', 'visible', 'have', '["borrowable"]', '["literary fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b13', 'qa-test-user', 'The Dispossessed', 'Ursula K. Le Guin', '9780061054884', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b14', 'qa-test-user', 'A Canticle for Leibowitz', 'Walter M. Miller Jr.', '9780060892999', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b15', 'qa-test-user', 'The Stars My Destination', 'Alfred Bester', '9780679767800', 'visible', 'have', '["borrowable"]', '["science fiction"]', 'manual', unixepoch(), unixepoch()),

  -- Discussable (10)
  ('b16', 'qa-test-user', 'Godel Escher Bach', 'Douglas Hofstadter', '9780465026562', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b17', 'qa-test-user', 'The Master and Margarita', 'Mikhail Bulgakov', '9780140455465', 'visible', 'have', '["discussable"]', '["literary fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b18', 'qa-test-user', 'Collected Fictions', 'Jorge Luis Borges', '9780140286809', 'visible', 'have', '["discussable"]', '["short stories"]', 'manual', unixepoch(), unixepoch()),
  ('b19', 'qa-test-user', 'Meditations', 'Marcus Aurelius', '9780140449136', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b20', 'qa-test-user', 'The Myth of Sisyphus', 'Albert Camus', '9780679733737', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b21', 'qa-test-user', 'Being and Time', 'Martin Heidegger', '9780061575594', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b22', 'qa-test-user', 'Thus Spoke Zarathustra', 'Friedrich Nietzsche', '9780140441185', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b23', 'qa-test-user', 'The Republic', 'Plato', '9780140455113', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b24', 'qa-test-user', 'Critique of Pure Reason', 'Immanuel Kant', '9780140447477', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),
  ('b25', 'qa-test-user', 'The Phenomenology of Spirit', 'G.W.F. Hegel', '9780198245971', 'visible', 'have', '["discussable"]', '["philosophy"]', 'manual', unixepoch(), unixepoch()),

  -- Both borrowable and discussable (5)
  ('b26', 'qa-test-user', 'Thinking Fast and Slow', 'Daniel Kahneman', '9780374533557', 'visible', 'have', '["borrowable", "discussable"]', '["psychology"]', 'manual', unixepoch(), unixepoch()),
  ('b27', 'qa-test-user', 'Sapiens', 'Yuval Noah Harari', '9780062316097', 'visible', 'have', '["borrowable", "discussable"]', '["history"]', 'manual', unixepoch(), unixepoch()),
  ('b28', 'qa-test-user', 'The Selfish Gene', 'Richard Dawkins', '9780199291151', 'visible', 'have', '["borrowable", "discussable"]', '["science"]', 'manual', unixepoch(), unixepoch()),
  ('b29', 'qa-test-user', 'Guns Germs and Steel', 'Jared Diamond', '9780393317558', 'visible', 'have', '["borrowable", "discussable"]', '["history"]', 'manual', unixepoch(), unixepoch()),
  ('b30', 'qa-test-user', 'A Brief History of Time', 'Stephen Hawking', '9780553380163', 'visible', 'have', '["borrowable", "discussable"]', '["science"]', 'manual', unixepoch(), unixepoch()),

  -- Giftable (5)
  ('b31', 'qa-test-user', 'The Alchemist', 'Paulo Coelho', '9780062315007', 'visible', 'have', '["giftable"]', '["fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b32', 'qa-test-user', 'Jonathan Livingston Seagull', 'Richard Bach', '9781476793313', 'visible', 'have', '["giftable"]', '["fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b33', 'qa-test-user', 'The Little Prince', 'Antoine de Saint-Exupery', '9780156012195', 'visible', 'have', '["giftable"]', '["fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b34', 'qa-test-user', 'Siddhartha', 'Hermann Hesse', '9780553208849', 'visible', 'have', '["giftable"]', '["fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b35', 'qa-test-user', 'Tuesdays with Morrie', 'Mitch Albom', '9780767905923', 'visible', 'have', '["giftable"]', '["memoir"]', 'manual', unixepoch(), unixepoch()),

  -- Borrowable textbooks (5)
  ('b36', 'qa-test-user', 'The Elements of Style', 'Strunk and White', '9780205309023', 'visible', 'have', '["borrowable"]', '["writing"]', 'manual', unixepoch(), unixepoch()),
  ('b37', 'qa-test-user', 'Structure and Interpretation', 'Abelson Sussman', '9780262510875', 'visible', 'have', '["borrowable"]', '["programming"]', 'manual', unixepoch(), unixepoch()),
  ('b38', 'qa-test-user', 'Introduction to Algorithms', 'Cormen et al', '9780262033848', 'visible', 'have', '["borrowable"]', '["programming"]', 'manual', unixepoch(), unixepoch()),
  ('b39', 'qa-test-user', 'Design Patterns', 'Gang of Four', '9780201633610', 'visible', 'have', '["borrowable"]', '["programming"]', 'manual', unixepoch(), unixepoch()),
  ('b40', 'qa-test-user', 'Clean Code', 'Robert C. Martin', '9780132350884', 'visible', 'have', '["borrowable"]', '["programming"]', 'manual', unixepoch(), unixepoch()),

  -- Seeking (5)
  ('b41', 'qa-test-user', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'seeking', '[]', '["fantasy"]', 'manual', unixepoch(), unixepoch()),
  ('b42', 'qa-test-user', 'The Name of the Wind', 'Patrick Rothfuss', '9780756404741', 'visible', 'seeking', '[]', '["fantasy"]', 'manual', unixepoch(), unixepoch()),
  ('b43', 'qa-test-user', 'House of Leaves', 'Mark Z. Danielewski', '9780375703768', 'visible', 'seeking', '[]', '["horror"]', 'manual', unixepoch(), unixepoch()),
  ('b44', 'qa-test-user', 'Infinite Jest', 'David Foster Wallace', '9780316066525', 'visible', 'seeking', '[]', '["literary fiction"]', 'manual', unixepoch(), unixepoch()),
  ('b45', 'qa-test-user', 'Gravity''s Rainbow', 'Thomas Pynchon', '9780143039945', 'visible', 'seeking', '[]', '["literary fiction"]', 'manual', unixepoch(), unixepoch()),

  -- Private (5)
  ('b46', 'qa-test-user', 'My Diary', 'Me', NULL, 'private', 'have', '[]', NULL, 'manual', unixepoch(), unixepoch()),
  ('b47', 'qa-test-user', 'Embarrassing Self-Help', 'Some Author', NULL, 'private', 'have', '[]', NULL, 'manual', unixepoch(), unixepoch()),
  ('b48', 'qa-test-user', 'Secret Guilty Pleasure', 'Anonymous', NULL, 'private', 'have', '[]', NULL, 'manual', unixepoch(), unixepoch()),
  ('b49', 'qa-test-user', 'Gift From Ex', 'Various', NULL, 'private', 'have', '[]', NULL, 'manual', unixepoch(), unixepoch()),
  ('b50', 'qa-test-user', 'Weird Niche Interest', 'Obscure Author', NULL, 'private', 'have', '[]', NULL, 'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- OTHER USERS' BOOKS (for matching)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, added_via, created_at, updated_at)
VALUES
  -- Requesters have overlapping books
  ('br1-1', 'user-requester-1', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch()),
  ('br1-2', 'user-requester-1', 'Foundation', 'Isaac Asimov', '9780553293357', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('br2-1', 'user-requester-2', 'Godel Escher Bach', 'Douglas Hofstadter', '9780465026562', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch()),
  ('br2-2', 'user-requester-2', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),

  -- Connected user
  ('bc-1', 'user-connected', 'Neuromancer', 'William Gibson', '9780441569595', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bc-2', 'user-connected', 'The Master and Margarita', 'Mikhail Bulgakov', '9780140455465', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch()),

  -- Nearby users with various books
  ('bn1-1', 'user-nearby-1', 'Hyperion', 'Dan Simmons', '9780553283686', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bn2-1', 'user-nearby-2', '1984', 'George Orwell', '9780451524935', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bn3-1', 'user-nearby-3', 'Sapiens', 'Yuval Noah Harari', '9780062316097', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch()),
  ('bn4-1', 'user-nearby-4', 'Thinking Fast and Slow', 'Daniel Kahneman', '9780374533557', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bn5-1', 'user-nearby-5', 'The Selfish Gene', 'Richard Dawkins', '9780199291151', 'visible', 'have', '["discussable"]', 'manual', unixepoch(), unixepoch()),

  -- Stores with power user's seeking books
  ('bs1-1', 'store-1', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bs1-2', 'store-1', 'House of Leaves', 'Mark Z. Danielewski', '9780375703768', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch()),
  ('bs2-1', 'store-2', 'Infinite Jest', 'David Foster Wallace', '9780316066525', 'visible', 'have', '["borrowable"]', 'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- CONNECTION REQUESTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Pending incoming requests
INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at)
VALUES
  ('req-pending-1', 'user-requester-1', 'qa-test-user', 'pending', unixepoch() - 3600),
  ('req-pending-2', 'user-requester-2', 'qa-test-user', 'pending', unixepoch() - 1800);

-- Accepted connection
INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at)
VALUES
  ('req-accepted', 'user-connected', 'qa-test-user', 'accepted', unixepoch() - 86400, unixepoch() - 43200);
