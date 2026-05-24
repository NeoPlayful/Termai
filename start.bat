@echo off
title Termai Manager - Dev Mode
echo ========================================
echo   Termai Manager - Development Mode
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing server dependencies...
cd /d "%~dp0server"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies.
    pause
    exit /b 1
)

echo [2/4] Installing web dependencies...
cd /d "%~dp0web"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install web dependencies.
    pause
    exit /b 1
)

echo [3/4] Starting server (port 6688)...
cd /d "%~dp0server"
start "Termai Server" /MIN cmd /c npm run dev

echo [4/4] Starting web dev server (port 5173)...
cd /d "%~dp0web"
start "Termai Web" /MIN cmd /c npm run dev

echo.
echo ========================================
echo   Termai is starting up!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:6688
echo ========================================
echo.
echo Press any key to stop all servers...
pause

echo Stopping servers...
taskkill /F /FI "WINDOWTITLE eq Termai Server" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Termai Web" >nul 2>&1
echo Done.
