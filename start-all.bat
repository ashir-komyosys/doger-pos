@echo off
cd /d %~dp0
echo ========================================
echo  Starting Dogar's Fire & Flavour
echo ========================================
echo.
echo [1/2] Starting Backend (API: http://localhost:4001)...
start "Backend" cmd /c "cd apps\backend && node dist/src/main.js"
echo.
echo [2/2] Starting Frontend (Web: http://localhost:3000)...
start "Frontend" cmd /c "cd apps\web && node node_modules/next/dist/bin/next dev"
echo.
echo ========================================
echo  Both servers are starting...
echo Backend:  http://localhost:4001
echo Web:      http://localhost:3000
echo ========================================
echo.
echo Close this window to stop both servers.
echo ========================================
pause