@echo off
REM Smart Campus Deployment Helper Script
REM Run this after installing Git and Node.js

echo.
echo ====================================
echo Smart Campus Deployment Helper
echo ====================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed!
    echo Please download and install Git from: https://git-scm.com/download/win
    echo Then restart this script.
    pause
    exit /b 1
)

echo [OK] Git is installed

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js is installed

REM Initialize Git repository
echo.
echo Initializing Git repository...
git init

REM Add all files
echo Adding files to Git...
git add .

REM Create first commit
echo Creating first commit...
git commit -m "Initial commit - Smart Campus System"

echo.
echo ====================================
echo Next Steps:
echo ====================================
echo.
echo 1. Create a GitHub repository at: https://github.com/new
echo    - Name it: smart-campus-directory
echo    - Keep it PUBLIC
echo    - Do NOT initialize with README
echo.
echo 2. After creating the repository, run these commands:
echo    (Replace YOUR_USERNAME with your GitHub username)
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/smart-campus-directory.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Follow the DEPLOYMENT_GUIDE.md for the rest of the steps
echo.
pause
