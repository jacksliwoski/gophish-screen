@echo off
echo ================================================
echo  Gophish-Screen Database Setup
echo ================================================

REM Check if sqlite3 is available
sqlite3 -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: SQLite3 is not installed or not in PATH.
    echo.
    echo Please install SQLite3:
    echo 1. Download from: https://sqlite.org/download.html
    echo 2. Extract sqlite3.exe to your PATH or this directory
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo SQLite3 found, proceeding with setup...
echo.

REM Remove existing database
if exist gophish.db (
    echo Removing existing database...
    del gophish.db
    echo Existing database removed.
)

echo Creating new database with complete schema...
sqlite3 gophish.db < create_database.sql

if errorlevel 1 (
    echo ERROR: Failed to create database schema.
    pause
    exit /b 1
)

echo Database created successfully!
echo.
echo ================================================
echo  Database Setup Complete
echo ================================================
echo.
echo Now run: gophish.exe
echo.
echo The application should display admin credentials like:
echo "Please login with the username admin and the password [random_password]"
echo.
echo If you want to set a specific password instead, run:
echo set GOPHISH_INITIAL_ADMIN_PASSWORD=YourPassword123
echo gophish.exe
echo.
pause