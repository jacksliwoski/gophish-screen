-- MySQL: Add indexes for screening performance

-- +goose Up
-- SQL in section 'Up' is executed when this migration is applied

-- Index for screening status queries
CREATE INDEX idx_events_is_screened ON events(is_screened);

-- Index for campaign + screening queries
CREATE INDEX idx_events_campaign_screened ON events(campaign_id, is_screened);

-- Index for message type + screening queries  
CREATE INDEX idx_events_message_screened ON events(message, is_screened);

-- Index for events with details (used for re-screening)
CREATE INDEX idx_events_details_not_null ON events(campaign_id, details(1));

-- +goose Down
-- SQL section 'Down' is executed when this migration is rolled back

DROP INDEX idx_events_is_screened ON events;
DROP INDEX idx_events_campaign_screened ON events;
DROP INDEX idx_events_message_screened ON events;
DROP INDEX idx_events_details_not_null ON events;