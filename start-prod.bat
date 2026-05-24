@echo off
title Termai Manager - Production Mode
echo ========================================
echo   Termai Manager - Production Mode
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/5] Installing server dependencies...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies.
    pause
    exit /b 1
)

echo [2/5] Installing web dependencies...
cd /d "%~dp0web"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install web dependencies.
    pause
    exit /b 1
)

echo [3/5] Building web app...
cd /d "%~dp0web"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b 1
)

echo [4/5] Building server...
cd /d "%~dp0server"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Server build failed.
    pause
    exit /b 1
)

echo [5/5] Starting production server...
cd /d "%~dp0server"
start "Termai Server" /MIN cmd /c node dist/index.js

echo.
echo ========================================
echo   Termai is running in production mode!
echo   Access: http://localhost:6688
echo ========================================
echo.
echo Press any key to stop the server...
pause

echo Stopping server...
taskkill /F /FI "WINDOWTITLE eq Termai Server" >nul 2>&1
echo Done.
