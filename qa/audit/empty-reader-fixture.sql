-- Isolated local audit DB only. Use a fresh browser origin to avoid local recovery.
DELETE FROM connection_requests WHERE from_user_id='qa-test-user' OR to_user_id='qa-test-user';
DELETE FROM book_notes WHERE user_id='qa-test-user';
DELETE FROM books WHERE user_id='qa-test-user';
UPDATE users SET name=NULL, city=NULL, radius_km=5, topics_curated='[]', topics_freeform='[]', borrow_style=NULL, current_obsessions=NULL, latitude=NULL, longitude=NULL, contact_method=NULL, contact_value=NULL, contact_visibility='hidden' WHERE id='qa-test-user';
