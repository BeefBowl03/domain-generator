@echo off
echo Starting Domain Generator...
echo.

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo.
    echo Please edit .env file with your API keys before running again.
    echo Press any key to open .env file...
    pause >nul
    notepad .env
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting server...
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop the server
echo.
node server.js
