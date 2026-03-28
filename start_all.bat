@echo off
setlocal EnableExtensions
title HVAC Design Master - One Click Start

set "ENV_NAME=hvac-design"
set "PROJECT_ROOT=%~dp0"
set "SKIP_ENV_UPDATE=%SKIP_ENV_UPDATE%"
set "FORCE_ENV_UPDATE=%FORCE_ENV_UPDATE%"
set "SKIP_AUTO_OPEN=%SKIP_AUTO_OPEN%"

echo ========================================================
echo HVAC Design Master - bootstrap script
echo ========================================================
echo.

where conda >nul 2>&1
if errorlevel 1 (
    echo [ERROR] conda was not found in PATH.
    echo         Install Anaconda/Miniconda first.
    goto :FAIL
)

pushd "%PROJECT_ROOT%"

if not exist environment.yml (
    echo [ERROR] environment.yml not found.
    echo         Run this script from project root.
    goto :FAIL
)

echo [1/5] Checking conda environment: %ENV_NAME%
call conda run --no-capture-output -n %ENV_NAME% python -V >nul 2>&1
if errorlevel 1 (
    echo       Environment not found, creating...
    call conda env create -f environment.yml
    if errorlevel 1 (
        echo [ERROR] Failed to create conda environment.
        goto :FAIL
    )
) else (
    if /I "%FORCE_ENV_UPDATE%"=="1" (
        echo       FORCE_ENV_UPDATE=1, updating dependencies...
        call conda env update -n %ENV_NAME% -f environment.yml --prune
        if errorlevel 1 (
            echo [ERROR] Failed to update conda environment.
            goto :FAIL
        )
    ) else if /I "%SKIP_ENV_UPDATE%"=="1" (
        echo       SKIP_ENV_UPDATE=1, skip dependency update.
    ) else (
        echo       Environment exists, quick start enabled. Skip dependency update.
        echo       To update dependencies manually: set FORCE_ENV_UPDATE=1 ^&^& start_all.bat
    )
)

echo [2/5] Resolving environment path
set "ENV_PREFIX="
for /f "usebackq delims=" %%P in (`call conda run --no-capture-output -n %ENV_NAME% python -c "import sys; print(sys.prefix)"`) do (
    if not defined ENV_PREFIX set "ENV_PREFIX=%%P"
)
if not defined ENV_PREFIX (
    echo [ERROR] Failed to resolve conda environment path.
    goto :FAIL
)
if not exist "%ENV_PREFIX%\python.exe" (
    echo [ERROR] python.exe not found in environment: %ENV_PREFIX%
    goto :FAIL
)
if not exist "%ENV_PREFIX%\npm.cmd" (
    echo [ERROR] npm.cmd not found in environment: %ENV_PREFIX%
    echo         Check nodejs dependency in environment.yml.
    goto :FAIL
)

echo [3/5] Checking frontend dependencies
if exist node_modules (
    echo       node_modules found, skip npm install.
) else (
    echo       Installing npm dependencies...
    call "%ENV_PREFIX%\npm.cmd" install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        goto :FAIL
    )
)

echo [4/5] Starting backend at http://localhost:3001
start "HVAC Backend" cmd /k ""%ENV_PREFIX%\python.exe" -m uvicorn app:app --app-dir server --host 0.0.0.0 --port 3001"

echo [5/5] Starting frontend at http://localhost:3000
start "HVAC Frontend" cmd /k ""%ENV_PREFIX%\npm.cmd" run dev"

if /I "%SKIP_AUTO_OPEN%"=="1" (
    echo       Auto-open disabled by SKIP_AUTO_OPEN=1
) else (
    echo       Opening browser: http://localhost:3000/
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:3000/"
)

popd

echo.
echo Done. Backend and frontend were started in new windows.
echo If login fails, check "HVAC Backend" window first.
echo Default test accounts: user1 / user2 / user3
echo Default password: password123
echo.
pause
exit /b 0

:FAIL
echo.
echo Bootstrap failed. Please fix the error and run again.
echo.
pause
exit /b 1
