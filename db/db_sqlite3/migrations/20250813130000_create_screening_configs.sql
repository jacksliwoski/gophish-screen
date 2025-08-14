-- SQLite: Create screening_configs table

-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied

CREATE TABLE screening_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    gateway_cidrs TEXT,  -- JSON array of CIDR blocks
    gateway_ua_signatures TEXT,  -- JSON array of UA signatures  
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_date DATETIME NOT NULL,
    modified_date DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_screening_configs_user_id ON screening_configs(user_id);
CREATE INDEX idx_screening_configs_enabled ON screening_configs(user_id, enabled);

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back

DROP INDEX IF EXISTS idx_screening_configs_enabled;
DROP INDEX IF EXISTS idx_screening_configs_user_id;
DROP TABLE IF EXISTS screening_configs;