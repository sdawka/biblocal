-- QA Environment Seed Data
-- Run with: npx wrangler d1 execute biblocal-qa-db --env qa --remote --file=scripts/seed-qa.sql
--
-- The vibe: Pratchett fans, literary wanderers, philosophy nerds, people who
-- read Borges on the metro and have opinions about footnotes.

-- Clear existing data (order matters due to foreign key constraints)
DELETE FROM connection_requests;
DELETE FROM sessions;
DELETE FROM book_notes;
DELETE FROM books;
DELETE FROM users;

-- ═══════════════════════════════════════════════════════════════════════════
-- THE READERS
-- ═══════════════════════════════════════════════════════════════════════════

-- QA Test User: The Protagonist
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, current_obsessions, type, created_at, updated_at)
VALUES (
  'qa-test-user',
  'qa@biblocal.test',
  'Sam Vimes',
  'Montreal',
  8,
  '["literary fiction", "philosophy", "science fiction", "systems thinking"]',
  '["Pratchett completionist", "footnote enthusiast", "infinite library dreams"]',
  'dog-eared pages welcome, margin notes encouraged',
  'recursive narratives, unreliable narrators, books about books',
  'person',
  unixepoch(),
  unixepoch()
);

-- Shelf Twin: Shares the same weird taste
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, current_obsessions, type, created_at, updated_at)
VALUES (
  'user-esme',
  'esme@test.com',
  'Esmeralda Weatherwax',
  'Montreal',
  5,
  '["literary fiction", "philosophy", "fantasy", "psychology"]',
  '["headology", "narrative causality", "witchcraft as applied psychology"]',
  'return when you''re done, no rush',
  'stories that know they''re stories',
  'person',
  unixepoch(),
  unixepoch()
);

-- Local Source: Has the book you're seeking
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, current_obsessions, type, created_at, updated_at)
VALUES (
  'user-rincewind',
  'rincewind@test.com',
  'Rincewind the Wizzard',
  'Montreal',
  12,
  '["science fiction", "fantasy", "history", "travel"]',
  '["running away from things", "potato enthusiast", "reluctant heroism"]',
  'will lend if you promise not to return it in a dangerous situation',
  'maps of places that don''t exist yet',
  'person',
  unixepoch(),
  unixepoch()
);

-- Reading Mentor: Deep collection, loves to discuss
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, current_obsessions, type, created_at, updated_at)
VALUES (
  'user-vetinari',
  'vetinari@test.com',
  'Havelock Vetinari',
  'Montreal',
  15,
  '["philosophy", "politics", "systems thinking", "history"]',
  '["efficient governance", "one man one vote (him)", "semaphore networks"]',
  'precision returns appreciated',
  'game theory, Machiavelli rehabilitated, organizational behavior',
  'person',
  unixepoch(),
  unixepoch()
);

-- Discussion Match: Overlapping interests, different collection
INSERT INTO users (id, email, name, city, radius_km, topics_curated, topics_freeform, borrow_style, current_obsessions, type, created_at, updated_at)
VALUES (
  'user-tiffany',
  'tiffany@test.com',
  'Tiffany Aching',
  'Montreal',
  6,
  '["fantasy", "philosophy", "ecology", "anthropology"]',
  '["shepherding", "First Sight and Second Thoughts", "cheese-making"]',
  'treat books like friends you''re visiting',
  'land and story, practical magic, small gods',
  'person',
  unixepoch(),
  unixepoch()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- THE BOOKS (Sam's Shelf)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, subjects, notes, added_via, created_at, updated_at)
VALUES
  -- The lending pile
  ('book-geb', 'qa-test-user', 'Gödel, Escher, Bach', 'Douglas Hofstadter', '9780465026562', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0465026567-M.jpg',
   '["philosophy", "mathematics", "consciousness", "recursion"]',
   'Warning: may cause spontaneous conversations about strange loops',
   'manual', unixepoch(), unixepoch()),

  ('book-dispossessed', 'qa-test-user', 'The Dispossessed', 'Ursula K. Le Guin', '9780061054884', 'visible', 'have', '["borrowable", "discussable"]',
   'https://covers.openlibrary.org/b/isbn/0061054887-M.jpg',
   '["science fiction", "philosophy", "politics", "anarchism"]',
   'The ambiguous utopia. Pairs well with late-night walks.',
   'manual', unixepoch(), unixepoch()),

  -- Want to discuss these
  ('book-master', 'qa-test-user', 'The Master and Margarita', 'Mikhail Bulgakov', '9780140455465', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0140455469-M.jpg',
   '["literary fiction", "satire", "philosophy", "magical realism"]',
   'Manuscripts don''t burn. Looking for someone who gets the cat jokes.',
   'manual', unixepoch(), unixepoch()),

  ('book-borges', 'qa-test-user', 'Collected Fictions', 'Jorge Luis Borges', '9780140286809', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0140286802-M.jpg',
   '["literary fiction", "philosophy", "short stories", "labyrinths"]',
   'The library of Babel lives in my head rent-free',
   'manual', unixepoch(), unixepoch()),

  -- Just on the shelf (visible, no intents)
  ('book-calvino', 'qa-test-user', 'If on a winter''s night a traveler', 'Italo Calvino', '9780156439619', 'visible', 'have', '[]',
   'https://covers.openlibrary.org/b/isbn/0156439611-M.jpg',
   '["literary fiction", "metafiction", "postmodern"]',
   'You are about to begin reading',
   'manual', unixepoch(), unixepoch()),

  ('book-lightness', 'qa-test-user', 'The Unbearable Lightness of Being', 'Milan Kundera', '9780061148521', 'visible', 'have', '[]',
   'https://covers.openlibrary.org/b/isbn/0061148520-M.jpg',
   '["literary fiction", "philosophy", "love"]',
   'Einmal ist keinmal',
   'manual', unixepoch(), unixepoch()),

  -- Free to good home
  ('book-solitude', 'qa-test-user', 'One Hundred Years of Solitude', 'Gabriel García Márquez', '9780060883287', 'visible', 'have', '["giftable"]',
   'https://covers.openlibrary.org/b/isbn/0060883286-M.jpg',
   '["literary fiction", "magical realism", "family saga"]',
   'Read it twice. Time for it to find a new reader.',
   'manual', unixepoch(), unixepoch()),

  -- Looking for this one (seeking)
  ('book-small-gods', 'qa-test-user', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'seeking', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0062237373-M.jpg',
   '["fantasy", "satire", "philosophy", "religion"]',
   'Lost my copy. The turtle moves.',
   'manual', unixepoch(), unixepoch()),

  -- Private (doesn't show to others)
  ('book-beloved', 'qa-test-user', 'Beloved', 'Toni Morrison', '9781400033416', 'private', 'have', '[]',
   'https://covers.openlibrary.org/b/isbn/1400033411-M.jpg',
   '["literary fiction", "history", "American literature"]',
   'Not lending this one. Too many notes in the margins.',
   'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- ESME'S SHELF (The Shelf Twin)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, subjects, notes, added_via, created_at, updated_at)
VALUES
  -- Shared taste! Also has GEB and Borges
  ('book-esme-geb', 'user-esme', 'Gödel, Escher, Bach', 'Douglas Hofstadter', '9780465026562', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0465026567-M.jpg',
   '["philosophy", "mathematics", "consciousness"]',
   'The ant fugue chapter changed how I think',
   'manual', unixepoch(), unixepoch()),

  ('book-esme-borges', 'user-esme', 'Collected Fictions', 'Jorge Luis Borges', '9780140286809', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0140286802-M.jpg',
   '["literary fiction", "philosophy", "labyrinths"]',
   'Every re-read finds new corridors',
   'manual', unixepoch(), unixepoch()),

  ('book-esme-witches', 'user-esme', 'Witches Abroad', 'Terry Pratchett', '9780062237361', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0062237361-M.jpg',
   '["fantasy", "satire", "fairy tales"]',
   'Stories want to happen. Witches make sure the right ones do.',
   'manual', unixepoch(), unixepoch()),

  ('book-esme-remains', 'user-esme', 'The Remains of the Day', 'Kazuo Ishiguro', '9780679731726', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0679731725-M.jpg',
   '["literary fiction", "British literature", "memory"]',
   'Dignified devastation',
   'manual', unixepoch(), unixepoch()),

  ('book-esme-jung', 'user-esme', 'Man and His Symbols', 'Carl Jung', '9780440351832', 'visible', 'have', '[]',
   'https://covers.openlibrary.org/b/isbn/0440351839-M.jpg',
   '["psychology", "symbolism", "dreams"]',
   'Headology by another name',
   'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- RINCEWIND'S SHELF (The Local Source - has Small Gods!)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, subjects, notes, added_via, created_at, updated_at)
VALUES
  -- Has the book Sam is seeking!
  ('book-rin-smallgods', 'user-rincewind', 'Small Gods', 'Terry Pratchett', '9780062237378', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0062237373-M.jpg',
   '["fantasy", "satire", "philosophy"]',
   'Om is my favorite character in all of literature',
   'manual', unixepoch(), unixepoch()),

  ('book-rin-color', 'user-rincewind', 'The Colour of Magic', 'Terry Pratchett', '9780062225672', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0062225672-M.jpg',
   '["fantasy", "satire", "humor"]',
   'Where it all began. The luggage is underrated.',
   'manual', unixepoch(), unixepoch()),

  ('book-rin-dune', 'user-rincewind', 'Dune', 'Frank Herbert', '9780441172719', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0441172717-M.jpg',
   '["science fiction", "ecology", "politics"]',
   'The spice must flow, but so must this book',
   'manual', unixepoch(), unixepoch()),

  ('book-rin-left-hand', 'user-rincewind', 'The Left Hand of Darkness', 'Ursula K. Le Guin', '9780441478125', 'visible', 'have', '["giftable"]',
   'https://covers.openlibrary.org/b/isbn/0441478123-M.jpg',
   '["science fiction", "gender", "anthropology"]',
   'Winter is a character',
   'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- VETINARI'S SHELF (The Reading Mentor)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, subjects, notes, added_via, created_at, updated_at)
VALUES
  ('book-vet-prince', 'user-vetinari', 'The Prince', 'Niccolò Machiavelli', '9780140449150', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0140449159-M.jpg',
   '["philosophy", "politics", "history"]',
   'Misunderstood. Like most useful things.',
   'manual', unixepoch(), unixepoch()),

  ('book-vet-seeing', 'user-vetinari', 'Seeing Like a State', 'James C. Scott', '9780300078152', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0300078153-M.jpg',
   '["politics", "systems thinking", "history"]',
   'Why high modernism fails. Essential reading.',
   'manual', unixepoch(), unixepoch()),

  ('book-vet-thinking', 'user-vetinari', 'Thinking in Systems', 'Donella Meadows', '9781603580557', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/1603580557-M.jpg',
   '["systems thinking", "ecology", "economics"]',
   'Leverage points for changing complex systems',
   'manual', unixepoch(), unixepoch()),

  ('book-vet-nightwatch', 'user-vetinari', 'Night Watch', 'Terry Pratchett', '9780060013127', 'visible', 'have', '[]',
   'https://covers.openlibrary.org/b/isbn/0060013125-M.jpg',
   '["fantasy", "politics", "revolution"]',
   'Pratchett''s masterpiece. Don''t @ me.',
   'manual', unixepoch(), unixepoch()),

  ('book-vet-antifragile', 'user-vetinari', 'Antifragile', 'Nassim Nicholas Taleb', '9780812979688', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0812979680-M.jpg',
   '["philosophy", "economics", "systems thinking"]',
   'Chaos is a ladder, properly used',
   'manual', unixepoch(), unixepoch()),

  ('book-vet-zen', 'user-vetinari', 'Zen and the Art of Motorcycle Maintenance', 'Robert Pirsig', '9780060839871', 'visible', 'have', '["giftable"]',
   'https://covers.openlibrary.org/b/isbn/0060839872-M.jpg',
   '["philosophy", "memoir", "quality"]',
   'Quality undefined but recognized',
   'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- TIFFANY'S SHELF (Discussion Match)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO books (id, user_id, title, author, isbn, visibility, ownership, intents, cover_url, subjects, notes, added_via, created_at, updated_at)
VALUES
  ('book-tiff-dispossessed', 'user-tiffany', 'The Dispossessed', 'Ursula K. Le Guin', '9780061054884', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/0061054887-M.jpg',
   '["science fiction", "philosophy", "anarchism"]',
   'True ambiguity is hard to write',
   'manual', unixepoch(), unixepoch()),

  ('book-tiff-wee', 'user-tiffany', 'The Wee Free Men', 'Terry Pratchett', '9780062435262', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0062435264-M.jpg',
   '["fantasy", "coming of age", "witchcraft"]',
   'First Sight: seeing what''s really there',
   'manual', unixepoch(), unixepoch()),

  ('book-tiff-braiding', 'user-tiffany', 'Braiding Sweetgrass', 'Robin Wall Kimmerer', '9781571313560', 'visible', 'have', '["discussable"]',
   'https://covers.openlibrary.org/b/isbn/1571313567-M.jpg',
   '["ecology", "indigenous knowledge", "nature"]',
   'Science and story together at last',
   'manual', unixepoch(), unixepoch()),

  ('book-tiff-siddhartha', 'user-tiffany', 'Siddhartha', 'Hermann Hesse', '9780553208849', 'visible', 'have', '["borrowable"]',
   'https://covers.openlibrary.org/b/isbn/0553208845-M.jpg',
   '["philosophy", "spirituality", "literary fiction"]',
   'The river knows',
   'manual', unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- THE BOOKSTORES (Montreal vibes)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users (id, email, name, city, type, address, neighborhood, specialties, created_at, updated_at)
VALUES
  ('store-drawn', 'drawn@test.com', 'Drawn & Quarterly', 'Montreal', 'bookstore',
   '211 Rue Bernard O', 'Mile End',
   '["literary fiction", "comics", "art", "local authors", "Quebecois literature"]',
   unixepoch(), unixepoch()),

  ('store-word', 'word@test.com', 'The Word', 'Montreal', 'bookstore',
   '469 Milton St', 'McGill Ghetto',
   '["used books", "philosophy", "literary fiction", "poetry", "academic"]',
   unixepoch(), unixepoch()),

  ('store-argo', 'argo@test.com', 'Argo Bookshop', 'Montreal', 'bookstore',
   '1915 Ste-Catherine O', 'Shaughnessy Village',
   '["used books", "rare books", "first editions", "literary fiction"]',
   unixepoch(), unixepoch()),

  ('store-librarie', 'librarie@test.com', 'Librairie Le Port de Tête', 'Montreal', 'bookstore',
   '262 Avenue du Mont-Royal E', 'Plateau Mont-Royal',
   '["philosophy", "poetry", "essays", "Quebecois literature", "francophone"]',
   unixepoch(), unixepoch());

-- ═══════════════════════════════════════════════════════════════════════════
-- BOOK NOTES — things people liked about their books (mixed private/public)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO book_notes (id, book_id, user_id, text, visibility, created_at, updated_at)
VALUES
  ('note-geb-1', 'book-geb', 'qa-test-user',
   'The dialogues between chapters are the best part — Achilles and the Tortoise live rent-free in my head.',
   'visible', unixepoch(), unixepoch()),
  ('note-geb-2', 'book-geb', 'qa-test-user',
   'Reminder to myself: re-read the MU puzzle chapter, I never fully got it.',
   'private', unixepoch(), unixepoch()),
  ('note-dispossessed-1', 'book-dispossessed', 'qa-test-user',
   'The ambiguous utopia framing changed how I think about political fiction.',
   'visible', unixepoch(), unixepoch());
