@echo off
setlocal

echo  Modly — Launcher
echo ================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download it from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Download embedded Python if missing
if not exist "resources\python-embed\python.exe" (
    echo [2/3] Downloading bundled Python runtime...
    call npm run prepare-resources
    if errorlevel 1 (
        echo [ERROR] Failed to download Python runtime.
        pause
        exit /b 1
    )
    echo.
)

:: Build if out/ is missing
if not exist "out\" (
    echo [3/3] Building the app...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
    echo.
)

:: Launch
echo Launching Modly...
call npm run preview

endlocal
