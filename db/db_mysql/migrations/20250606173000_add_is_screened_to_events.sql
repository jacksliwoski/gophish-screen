-- +goose Up
ALTER TABLE events ADD COLUMN is_screened BOOLEAN DEFAULT 0;

-- +goose Down
-- (optional) SQLite can’t DROP columns easily; you can leave Down empty or
-- rebuild the table manually if you really need a rollback.
