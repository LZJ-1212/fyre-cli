@echo off
chcp 65001 >nul
title CodeCraft Agent 啟動器
color 0B

echo ===================================================
echo             🚀 歡迎使用 CodeCraft Agent 🚀
echo ===================================================
echo.

:: 第一步：自動檢查 Node.js，沒有就全自動安裝！
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [系統] 偵測到您尚未安裝環境引擎 Node.js ！
    echo [系統] 正在為您「全自動靜默下載並安裝」...
    echo ⚠️ 注意：這可能需要 1~3 分鐘，如果有彈出 管理員權限確認 視窗，請點擊 是
    echo.
    
    :: 呼叫 Windows 內建的 winget 進行無人值守安裝
    winget install OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    
    echo.
    echo ✅ 環境引擎安裝完畢！
    echo ⚠️ 為了讓系統載入全新的環境變數，請「關閉這個黑色視窗」，然後「重新雙擊打開」本腳本！
    pause
    exit /b
)

:: 第二步：自動檢查是否需要安裝 npm 套件
if not exist "node_modules\" (
    echo [系統] 偵測到這是您第一次運行，正在為您自動下載核心組件...
    echo 請稍候，這可能需要幾分鐘的時間。
    call npm install >nul 2>nul
    echo ✅ 核心組件安裝完成！
    echo.
)

:: 第三步：直接啟動 Web GUI
echo [系統] 正在啟動 AI 核心與網頁介面...
echo 請不要關閉這個黑色視窗，您可以直接在彈出的瀏覽器中開始使用！
echo.

:: 呼叫 CLI 啟動伺服器
node bin/cli.js ui

pause