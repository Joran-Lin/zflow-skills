@echo off
chcp 65001 >nul 2>&1
echo.
echo === zflow-skills Setup ===
echo.

:: ── Step 0: Ensure Node.js is available ──────────────────────────
where node >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Node.js found:
    node --version
    echo.
    goto :run_check
)

echo [MISSING] Node.js not found on PATH.
echo.

:: Try winget (Windows 10 1709+)
where winget >nul 2>&1
if %errorlevel%==0 (
    echo Installing Node.js 22 LTS via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel%==0 (
        echo.
        echo [OK] Node.js installed. Refreshing PATH...
        :: winget installs to Program Files, refresh PATH for current session
        set "PATH=%PATH%;C:\Program Files\nodejs"
        where node >nul 2>&1
        if %errorlevel%==0 (
            node --version
            echo.
            goto :run_check
        )
    )
    echo [WARN] winget install may have succeeded but node not yet on PATH.
    echo        Please close and reopen this terminal, then run setup.bat again.
    exit /b 1
)

:: No winget — prompt user
echo [ERROR] Node.js is required but not installed, and winget is not available.
echo.
echo Please install Node.js 22 LTS manually:
echo   https://nodejs.org  (download the LTS installer)
echo.
echo Then re-run this script.
exit /b 1

:: ── Step 1: Run environment check ───────────────────────────────
:run_check
echo Running cross-platform environment check...
echo.

node scripts\check-env.mjs --fix
if errorlevel 1 (
    echo.
    echo [ERROR] Environment check failed. Fix the issues above.
    exit /b 1
)

echo.
echo === Setup complete ===
echo Open this directory in your IDE and invoke /video-brief to get started.
