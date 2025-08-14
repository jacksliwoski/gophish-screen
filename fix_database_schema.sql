-- Fix missing columns in users table
-- This script adds the missing columns that should have been added by migrations

-- Add password_change_required column if it doesn't exist
ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT TRUE;

-- Add last_login column if it doesn't exist  
ALTER TABLE users ADD COLUMN last_login datetime;

-- Add account_locked column if it doesn't exist
ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT FALSE;

-- Update any existing admin user to require password change
UPDATE users SET password_change_required = TRUE WHERE username = 'admin';