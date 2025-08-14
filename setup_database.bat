@echo off
echo Setting up Gophish database with proper schema...

REM Check if sqlite3 is available
sqlite3 -version >nul 2>&1
if errorlevel 1 (
    echo SQLite3 is not installed or not in PATH.
    echo Please install SQLite3 or run gophish.exe and manually fix the database.
    pause
    exit /b 1
)

REM Delete existing database to start fresh
if exist gophish.db (
    echo Removing existing database...
    del gophish.db
)

echo Creating new database and running initial setup...
REM Run the application briefly to create the initial database structure
timeout /t 2 >nul
start /wait /min gophish.exe &
timeout /t 5 >nul
taskkill /f /im gophish.exe >nul 2>&1

REM Apply our schema fixes
echo Applying schema fixes...
sqlite3 gophish.db < fix_database_schema.sql

echo Database setup complete!
echo Now run gophish.exe to start the application.
echo You should see the admin credentials displayed in the console.
pause