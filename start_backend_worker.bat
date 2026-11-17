@echo off
setlocal EnableExtensions

set "PROJECT_ROOT=%~dp0"
set "ENV_PREFIX=%~1"
if not defined BACKEND_PORT set "BACKEND_PORT=3101"
if not defined ENV_PREFIX (
    echo [ERROR] ENV_PREFIX argument is required.
    exit /b 1
)

pushd "%PROJECT_ROOT%"
set "PATH=%ENV_PREFIX%;%PATH%"
"%ENV_PREFIX%\python.exe" "%PROJECT_ROOT%server\run_backend.py" --host 0.0.0.0 --port %BACKEND_PORT%
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
