-- Complete Gophish database initialization script
-- This creates all tables with ALL necessary columns from the start

-- Users table with ALL columns needed
CREATE TABLE "users" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "hash" VARCHAR(255),
    "api_key" VARCHAR(255) NOT NULL UNIQUE,
    "role_id" INTEGER,
    "password_change_required" BOOLEAN DEFAULT TRUE,
    "last_login" DATETIME,
    "account_locked" BOOLEAN DEFAULT FALSE
);

-- Events table with ALL columns needed  
CREATE TABLE "events" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" BIGINT,
    "email" VARCHAR(255),
    "time" DATETIME,
    "message" VARCHAR(255),
    "details" VARCHAR(255),
    "is_screened" BOOLEAN DEFAULT FALSE
);

-- All other base tables
CREATE TABLE "templates" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "subject" VARCHAR(255),
    "text" VARCHAR(255),
    "html" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE "targets" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255),
    "position" VARCHAR(255)
);

CREATE TABLE "smtp" (
    "smtp_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" BIGINT,
    "host" VARCHAR(255),
    "username" VARCHAR(255),
    "from_address" VARCHAR(255)
);

CREATE TABLE "results" (
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

CREATE TABLE "pages" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "html" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE "groups" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "name" VARCHAR(255),
    "modified_date" DATETIME
);

CREATE TABLE "group_targets" (
    "group_id" BIGINT,
    "target_id" BIGINT
);

CREATE TABLE "campaigns" (
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

CREATE TABLE "attachments" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "template_id" BIGINT,
    "content" VARCHAR(255),
    "type" VARCHAR(255),
    "name" VARCHAR(255)
);

-- RBAC tables
CREATE TABLE "roles" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" VARCHAR(255)
);

CREATE TABLE "permissions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "description" VARCHAR(255)
);

CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL
);

-- Mail logs table
CREATE TABLE "mail_logs" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER,
    "user_id" INTEGER,
    "send_date" DATETIME,
    "send_attempt" INTEGER,
    "r_id" VARCHAR(255),
    "processing" BOOLEAN
);

-- Headers table
CREATE TABLE "headers" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "key" VARCHAR(255),
    "value" VARCHAR(255),
    "smtp_id" BIGINT
);

-- Email requests table
CREATE TABLE "email_requests" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "template_id" INTEGER,
    "page_id" INTEGER,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255),
    "position" VARCHAR(255),
    "url" VARCHAR(255),
    "r_id" VARCHAR(255),
    "from_address" VARCHAR(255)
);

-- Webhooks table  
CREATE TABLE "webhooks" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" VARCHAR(255),
    "url" VARCHAR(1000),
    "secret" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT 0
);

-- IMAP table
CREATE TABLE "imap" (
    "user_id" BIGINT,
    "host" VARCHAR(255),
    "port" INTEGER,
    "username" VARCHAR(255),
    "password" VARCHAR(255),
    "modified_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "tls" BOOLEAN,
    "enabled" BOOLEAN,
    "folder" VARCHAR(255),
    "restrict_domain" VARCHAR(255),
    "delete_reported_campaign_email" BOOLEAN,
    "last_login" DATETIME,
    "imap_freq" INTEGER
);

-- Screening configurations table
CREATE TABLE "screening_configs" (
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

-- Insert default roles with explicit IDs
INSERT INTO "roles" ("id", "slug", "name", "description") VALUES
    (1, 'admin', 'Admin', 'System administrator with full permissions'),
    (2, 'user', 'User', 'User role with edit access to objects and campaigns');

-- Insert default permissions with explicit IDs
INSERT INTO "permissions" ("id", "slug", "name", "description") VALUES
    (1, 'view_objects', 'View Objects', 'View objects in Gophish'),
    (2, 'modify_objects', 'Modify Objects', 'Create and edit objects in Gophish'),
    (3, 'modify_system', 'Modify System', 'Manage system-wide configuration');

-- Set up role permissions
INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
    (1, 1), (1, 2), (1, 3),  -- Admin has all permissions
    (2, 1), (2, 2);          -- User has view and modify objects permissions

-- Create indexes for performance
CREATE INDEX "idx_events_campaign_id" ON "events" ("campaign_id");
CREATE INDEX "idx_events_is_screened" ON "events" ("is_screened");
CREATE INDEX "idx_events_message" ON "events" ("message");
CREATE INDEX "idx_events_time" ON "events" ("time");
CREATE INDEX "idx_screening_configs_user_id" ON "screening_configs" ("user_id");
CREATE INDEX "idx_screening_configs_active" ON "screening_configs" ("is_active");
CREATE INDEX "idx_users_role_id" ON "users" ("role_id");
CREATE INDEX "idx_users_username" ON "users" ("username");