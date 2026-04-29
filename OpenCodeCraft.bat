@echo off
chcp 65001 >nul
title CodeCraft Agentic IDE Launcher
color 0B

echo ===================================================
echo       🚀 Welcome to CodeCraft Agentic IDE 🚀
echo ===================================================
echo.

:: Step 1: Bootstrapping - Check Node.js runtime
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [System] Node.js runtime not found!
    echo [System] Initiating unattended installation via Windows Package Manager...
    echo [!] Please click 'Yes' if User Account Control (UAC) prompts appear.
    echo.
    
    winget install OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    
    echo.
    echo [✅] Node.js installation complete!
    echo [⚠️] ACTION REQUIRED: Please CLOSE this terminal and RE-OPEN the script to reload environment variables.
    pause
    exit /b
)

:: Step 2: Dependency Resolution
if not exist "node_modules\" (
    echo [System] First run detected. Resolving project dependencies...
    echo [System] Please wait, fetching packages from npm registry...
    call npm install >nul 2>nul
    echo [✅] Dependencies successfully installed!
    echo.
)

:: Step 3: Launching the Service
echo [System] Booting up CodeCraft Agentic Workflow Engine and Web UI...
echo [System] Keep this terminal open. The system will be available in your browser!
echo.

:: Standardized entry point for the Web GUI
node src/server.js

pause