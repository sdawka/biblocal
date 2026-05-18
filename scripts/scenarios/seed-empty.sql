-- QA Scenario: Empty User (Fresh Onboarding)
-- Tests: Onboarding flow, first book add, profile setup
--
-- The user exists (so QA auth works) but has no profile data.
-- isOnboarded() should return false, onboarding prompts should appear.

DELETE FROM connection_requests;
DELETE FROM books;
DELETE FROM users;

INSERT INTO users (id, email, created_at, updated_at)
VALUES (
  'qa-test-user',
  'qa@biblocal.test',
  unixepoch(),
  unixepoch()
);
