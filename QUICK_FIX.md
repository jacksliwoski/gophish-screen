# Quick Database Fix for Missing Columns

The error occurs because the database migration wasn't applied properly. Here are two ways to fix this:

## Option 1: Manual SQL Fix (Recommended)

1. **Install SQLite3 command-line tool** if you don't have it:
   - Download from: https://sqlite.org/download.html
   - Or install via package manager

2. **Delete the existing database**:
   ```bash
   del gophish.db
   ```

3. **Create a minimal database with proper schema**:
   ```bash
   sqlite3 gophish.db < db/db_sqlite3/migrations/20160118194630_init.sql
   ```

4. **Apply the missing column migrations**:
   ```bash
   sqlite3 gophish.db "ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT TRUE;"
   sqlite3 gophish.db "ALTER TABLE users ADD COLUMN last_login datetime;"
   sqlite3 gophish.db "ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT FALSE;"
   ```

5. **Run gophish.exe** - it should now display the admin credentials!

## Option 2: Quick Command Line Fix

If you have SQLite3 installed, run these commands in order:

```cmd
del gophish.db
sqlite3 gophish.db "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, hash TEXT, api_key TEXT UNIQUE NOT NULL, role_id INTEGER, password_change_required BOOLEAN DEFAULT TRUE, account_locked BOOLEAN DEFAULT FALSE, last_login datetime);"
sqlite3 gophish.db "CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT, slug TEXT UNIQUE, description TEXT);"
sqlite3 gophish.db "INSERT INTO roles (id, name, slug, description) VALUES (1, 'Admin', 'admin', 'System Administrator');"
sqlite3 gophish.db "INSERT INTO roles (id, name, slug, description) VALUES (2, 'User', 'user', 'Normal User');"
```

Then run `gophish.exe` and it should display the admin credentials.

## Option 3: Environment Variable Method

Set a known password before running:
```cmd
set GOPHISH_INITIAL_ADMIN_PASSWORD=YourPassword123!
gophish.exe
```

Then login with:
- Username: `admin`  
- Password: `YourPassword123!`