-- Complete Gophish database initialization script
-- This creates all necessary tables with the correct schema

-- Initial tables from 20160118194630_init.sql
CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "hash" VARCHAR(255),
    "api_key" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "templates" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "subject" VARCHAR(255),
    "text" VARCHAR(255),
    "html" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE IF NOT EXISTS "targets" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255),
    "position" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "smtp" (
    "smtp_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" BIGINT,
    "host" VARCHAR(255),
    "username" VARCHAR(255),
    "from_address" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "results" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" BIGINT,
    "user_id" BIGINT,
    "r_id" VARCHAR(255),
    "email" VARCHAR(255),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(255),
    "latitude" REAL,
    "longitude" REAL
);

CREATE TABLE IF NOT EXISTS "pages" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "html" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE IF NOT EXISTS "groups" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE IF NOT EXISTS "group_targets" (
    "group_id" BIGINT,
    "target_id" BIGINT
);

CREATE TABLE IF NOT EXISTS "events" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" BIGINT,
    "email" VARCHAR(255),
    "time" DATETIME,
    "message" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "created_date" DATETIME,
    "completed_date" DATETIME,
    "template_id" BIGINT,
    "page_id" BIGINT,
    "status" VARCHAR(255),
    "url" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "attachments" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "template_id" BIGINT,
    "content" VARCHAR(255),
    "type" VARCHAR(255),
    "name" VARCHAR(255)
);

-- RBAC tables from 20190105192341_0.8.0_rbac.sql
CREATE TABLE IF NOT EXISTS "roles" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" VARCHAR(255)
);

-- Add role_id column to users table if it doesn't exist
ALTER TABLE "users" ADD COLUMN "role_id" INTEGER;

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL
);

-- Insert default roles
INSERT OR IGNORE INTO "roles" ("slug", "name", "description") VALUES
    ("admin", "Admin", "System administrator with full permissions"),
    ("user", "User", "User role with edit access to objects and campaigns");

-- Insert default permissions
INSERT OR IGNORE INTO "permissions" ("slug", "name", "description") VALUES
    ("view_objects", "View Objects", "View objects in Gophish"),
    ("modify_objects", "Modify Objects", "Create and edit objects in Gophish"),
    ("modify_system", "Modify System", "Manage system-wide configuration");

-- Additional columns from later migrations
-- Password policy (20200619000000_0.11.0_password_policy.sql)
ALTER TABLE "users" ADD COLUMN "password_change_required" BOOLEAN DEFAULT TRUE;

-- Last login (20200914000000_0.11.0_last_login.sql)  
ALTER TABLE "users" ADD COLUMN "last_login" DATETIME;

-- Account locked (20201201000000_0.11.0_account_locked.sql)
ALTER TABLE "users" ADD COLUMN "account_locked" BOOLEAN DEFAULT FALSE;

-- Event details (20160131153104_0.1.2_add_event_details.sql)
ALTER TABLE "events" ADD COLUMN "details" VARCHAR(255);

-- Screening functionality (our custom additions)
ALTER TABLE "events" ADD COLUMN "is_screened" BOOLEAN DEFAULT FALSE;

-- Create screening configurations table
CREATE TABLE IF NOT EXISTS "screening_configs" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cidr_blocks" TEXT,
    "ua_signatures" TEXT,
    "is_active" BOOLEAN DEFAULT FALSE,
    "created_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "modified_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_events_campaign_id" ON "events" ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_events_is_screened" ON "events" ("is_screened");
CREATE INDEX IF NOT EXISTS "idx_events_message" ON "events" ("message");
CREATE INDEX IF NOT EXISTS "idx_events_time" ON "events" ("time");
CREATE INDEX IF NOT EXISTS "idx_screening_configs_user_id" ON "screening_configs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_screening_configs_active" ON "screening_configs" ("is_active");