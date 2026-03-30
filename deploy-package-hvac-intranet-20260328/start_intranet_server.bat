@echo off
setlocal EnableExtensions
title HVAC Design Master - Intranet Server

set "PROJECT_ROOT=%~dp0"
set "PYTHON_EXE="

if exist "%PROJECT_ROOT%\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%\.venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] python was not found in PATH.
        echo         Install Python 3.11+ or create .venv first.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=python"
)

if not exist "%PROJECT_ROOT%\dist\index.html" (
    echo [ERROR] dist bundle not found.
    echo         Make sure the deploy package contains the dist folder.
    pause
    exit /b 1
)

if not exist "%PROJECT_ROOT%\server\app.py" (
    echo [ERROR] server\app.py not found.
    pause
    exit /b 1
)

pushd "%PROJECT_ROOT%"
echo Starting HVAC Design Master at http://0.0.0.0:3001
echo Open http://SERVER_IP:3001/ from the intranet browser.
"%PYTHON_EXE%" -m uvicorn server.app:app --host 0.0.0.0 --port 3001
popd

pause
