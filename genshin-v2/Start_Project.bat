@echo off
title Running: genshin-v2
color 0A
echo ===================================================
echo   Welcome to your AI-Generated Project!
echo ===================================================
echo.
echo [System] Starting local server on PORT 3000...
echo [System] If the app crashes, the error will stay on this screen!
echo.
set PORT=3000
start http://localhost:3000
:: Use call to ensure control returns and window does not crash
call npm start
echo.
echo [WARNING] The server process has stopped or crashed.
echo [TIP] Check the error messages above, copy them, and use AI Magic Edit!
pause