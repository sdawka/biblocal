-- Apply only to the isolated local audit database, after scripts/seed-qa.sql.
UPDATE users SET contact_method='email', contact_value='audit-reader@example.invalid', contact_visibility='on-request' WHERE id='qa-test-user';
UPDATE users SET contact_method='email', contact_value='audit-esme@example.invalid', contact_visibility='on-request' WHERE id='user-esme';
UPDATE users SET contact_method='email', contact_value='audit-rincewind@example.invalid', contact_visibility='on-request' WHERE id='user-rincewind';
UPDATE users SET contact_method='email', contact_value='audit-tiffany@example.invalid', contact_visibility='public' WHERE id='user-tiffany';
INSERT INTO connection_requests (id,from_user_id,to_user_id,status,created_at) VALUES ('audit-incoming','user-esme','qa-test-user','pending',unixepoch());
