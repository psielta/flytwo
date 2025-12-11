-- Remove bio column from users table

ALTER TABLE users DROP COLUMN bio;

---- create above / drop below ----

-- Rollback: add bio column back
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
