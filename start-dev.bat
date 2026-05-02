@echo off
title Ojaoba Dev Servers
echo.
echo  ==========================================
echo   Ojaoba Dev — Starting servers...
echo  ==========================================
echo.

:: Start backend in a new window
start "Ojaoba Backend :4000" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait 3 seconds then start frontend
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
start "Ojaoba Frontend :3000" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo  Backend  → http://localhost:4000/api
echo  Frontend → http://localhost:3000
echo  Admin    → http://localhost:3000/admin
echo.
echo  Both servers are starting in separate windows.
echo  Press any key to open the browser...
pause >nul

start http://localhost:3000
