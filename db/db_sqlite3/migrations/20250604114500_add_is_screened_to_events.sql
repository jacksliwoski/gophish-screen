-- +goose Up
-- SQLite: add is_screened to events
ALTER TABLE `events`
  ADD COLUMN `is_screened` BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
-- (SQLite does not support DROP COLUMN directly; skip or leave blank)
