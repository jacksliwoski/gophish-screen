-- +goose Up
-- MySQL/Postgres: add is_screened to events
ALTER TABLE `events`
  ADD COLUMN `is_screened` BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
-- MySQL/Postgres: drop is_screened when rolling back
ALTER TABLE `events`
  DROP COLUMN `is_screened`;
