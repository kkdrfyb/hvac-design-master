@echo off
setlocal EnableExtensions
title HVAC Design Master - One Click Start

set "ENV_NAME=hvac-design"
set "PROJECT_ROOT=%~dp0"
if not defined BACKEND_PORT set "BACKEND_PORT=3101"
set "CONDA_NO_PLUGINS=true"
set "CONDA_NUMBER_CHANNEL_NOTICES=0"
set "CONDA_OVERRIDE_CUDA=0"
set "CONDA_ENVS_PATH=%PROJECT_ROOT%.conda-local\envs"
set "CONDA_PKGS_DIRS=%PROJECT_ROOT%.conda-local\pkgs"
set "SKIP_ENV_UPDATE=%SKIP_ENV_UPDATE%"
set "FORCE_ENV_UPDATE=%FORCE_ENV_UPDATE%"
set "SKIP_AUTO_OPEN=%SKIP_AUTO_OPEN%"
set "HIDE_WINDOWS=%HIDE_WINDOWS%"
set "WEB_ONLY_MODE=%WEB_ONLY_MODE%"
set "CONDA_CMD="

echo ========================================================
echo HVAC Design Master - bootstrap script
echo ========================================================
echo.

call :RESOLVE_CONDA
if not defined CONDA_CMD (
    where conda >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] conda was not found in PATH.
        echo         Checked common Anaconda/Miniconda install locations too.
        echo         Install Anaconda/Miniconda first, or add conda to PATH.
        goto :FAIL
    )
    set "CONDA_CMD=conda"
)

if defined CONDA_CMD (
    echo Using conda command: %CONDA_CMD%
)

pushd "%PROJECT_ROOT%"
if not exist "%CONDA_ENVS_PATH%" mkdir "%CONDA_ENVS_PATH%" >nul 2>&1
if not exist "%CONDA_PKGS_DIRS%" mkdir "%CONDA_PKGS_DIRS%" >nul 2>&1

if not exist environment.yml (
    echo [ERROR] environment.yml not found.
    echo         Run this script from project root.
    goto :FAIL
)

echo [1/5] Checking conda environment: %ENV_NAME%
set "ENV_PREFIX="
call :RESOLVE_ENV_PREFIX
if not defined ENV_PREFIX (
    echo       Environment not found, creating...
    call "%CONDA_CMD%" env create --solver=classic -f environment.yml
    if errorlevel 1 (
        echo [ERROR] Failed to create conda environment.
        echo         Try again manually with plugins disabled:
        echo         set CONDA_NO_PLUGINS=true ^&^& "%CONDA_CMD%" env create --solver=classic -f environment.yml
        goto :FAIL
    )
    set "ENV_PREFIX="
    call :RESOLVE_ENV_PREFIX
    if not defined ENV_PREFIX (
        echo [ERROR] Environment was created but its path could not be resolved.
        goto :FAIL
    )
) else (
    if /I "%FORCE_ENV_UPDATE%"=="1" (
        echo       FORCE_ENV_UPDATE=1, updating dependencies...
        call "%CONDA_CMD%" env update --solver=classic -n %ENV_NAME% -f environment.yml --prune
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

if /I "%WEB_ONLY_MODE%"=="1" (
    echo [3/4] WEB_ONLY_MODE=1, skip frontend dependency check.
) else (
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
)

if /I "%WEB_ONLY_MODE%"=="1" (
    echo [4/4] Starting backend at http://127.0.0.1:%BACKEND_PORT%
) else (
    echo [4/5] Starting backend at http://localhost:%BACKEND_PORT%
)
call :FREE_PORT %BACKEND_PORT%
if /I "%HIDE_WINDOWS%"=="1" (
    echo       Hidden mode enabled, backend window will not be shown.
    powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -FilePath '%ComSpec%' -ArgumentList '/c', '""%PROJECT_ROOT%start_backend_worker.bat"" ""%ENV_PREFIX%""' -WorkingDirectory '%PROJECT_ROOT%' -WindowStyle Hidden" >nul 2>&1
) else (
    start "HVAC Backend" cmd /k ""%PROJECT_ROOT%start_backend_worker.bat" "%ENV_PREFIX%""
)

if /I not "%WEB_ONLY_MODE%"=="1" (
    echo [5/5] Starting frontend at http://localhost:3000
    call :FREE_PORT 3000
    if /I "%HIDE_WINDOWS%"=="1" (
        echo       Hidden mode enabled, frontend window will not be shown.
        powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -FilePath '%ComSpec%' -ArgumentList '/c', '""%PROJECT_ROOT%start_frontend_worker.bat"" ""%ENV_PREFIX%""' -WorkingDirectory '%PROJECT_ROOT%' -WindowStyle Hidden" >nul 2>&1
    ) else (
        start "HVAC Frontend" cmd /k ""%PROJECT_ROOT%start_frontend_worker.bat" "%ENV_PREFIX%""
    )
)

if /I "%SKIP_AUTO_OPEN%"=="1" (
    echo       Auto-open disabled by SKIP_AUTO_OPEN=1
) else (
    if /I "%WEB_ONLY_MODE%"=="1" (
        echo       Opening browser: http://127.0.0.1:%BACKEND_PORT%/
    ) else (
        echo       Opening browser: http://localhost:3000/
    )
    if /I not "%HIDE_WINDOWS%"=="1" (
        timeout /t 2 /nobreak >nul
    )
    if /I "%WEB_ONLY_MODE%"=="1" (
        start "" "http://127.0.0.1:%BACKEND_PORT%/"
    ) else (
        start "" "http://localhost:3000/"
    )
)

popd

echo.
if /I "%WEB_ONLY_MODE%"=="1" (
    echo Done. Backend was started for web-only mode.
) else (
    echo Done. Backend and frontend were started in new windows.
)
echo If login fails, check "HVAC Backend" window first.
echo Default test accounts: admin / user1 / user2 / user3
echo Default password: 123456
echo.
if /I "%HIDE_WINDOWS%"=="1" (
    exit /b 0
)
pause
exit /b 0

:FAIL
echo.
echo Bootstrap failed. Please fix the error and run again.
echo.
if /I "%HIDE_WINDOWS%"=="1" (
    exit /b 1
)
pause
exit /b 1

:RESOLVE_ENV_PREFIX
for %%P in (
    "%CONDA_ENVS_PATH%\%ENV_NAME%"
    "%USERPROFILE%\.conda\envs\%ENV_NAME%"
    "%USERPROFILE%\miniconda3\envs\%ENV_NAME%"
    "%USERPROFILE%\anaconda3\envs\%ENV_NAME%"
    "%USERPROFILE%\Miniconda3\envs\%ENV_NAME%"
    "%USERPROFILE%\Anaconda3\envs\%ENV_NAME%"
    "%LOCALAPPDATA%\miniconda3\envs\%ENV_NAME%"
    "%LOCALAPPDATA%\anaconda3\envs\%ENV_NAME%"
    "%LOCALAPPDATA%\Miniconda3\envs\%ENV_NAME%"
    "%LOCALAPPDATA%\Anaconda3\envs\%ENV_NAME%"
    "%ProgramData%\Miniconda3\envs\%ENV_NAME%"
    "%ProgramData%\Anaconda3\envs\%ENV_NAME%"
) do (
    if not defined ENV_PREFIX if exist "%%~fP\python.exe" (
        set "ENV_PREFIX=%%~fP"
    )
)
exit /b 0

:RESOLVE_CONDA
for %%C in (
    "%USERPROFILE%\miniconda3\condabin\conda.bat"
    "%USERPROFILE%\anaconda3\condabin\conda.bat"
    "%USERPROFILE%\Miniconda3\condabin\conda.bat"
    "%USERPROFILE%\Anaconda3\condabin\conda.bat"
    "%LOCALAPPDATA%\miniconda3\condabin\conda.bat"
    "%LOCALAPPDATA%\anaconda3\condabin\conda.bat"
    "%LOCALAPPDATA%\Miniconda3\condabin\conda.bat"
    "%LOCALAPPDATA%\Anaconda3\condabin\conda.bat"
    "%ProgramData%\Miniconda3\condabin\conda.bat"
    "%ProgramData%\Anaconda3\condabin\conda.bat"
) do (
    if not defined CONDA_CMD if exist "%%~fC" (
        set "CONDA_CMD=%%~fC"
    )
)
exit /b 0

:FREE_PORT
set "TARGET_PORT=%~1"
if not defined TARGET_PORT exit /b 0
set "FOUND_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%TARGET_PORT% .*LISTENING"') do (
    if not defined FOUND_PID (
        set "FOUND_PID=%%P"
    )
)
if defined FOUND_PID (
    echo       Port %TARGET_PORT% is already in use by PID %FOUND_PID%, stopping old process...
    taskkill /PID %FOUND_PID% /F >nul 2>&1
    timeout /t 1 /nobreak >nul
)
exit /b 0
