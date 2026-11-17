@echo off
setlocal EnableExtensions

set "PROJECT_ROOT=%~dp0"
set "ENV_PREFIX=%~1"
if not defined ENV_PREFIX (
    echo [ERROR] ENV_PREFIX argument is required.
    exit /b 1
)

pushd "%PROJECT_ROOT%"
set "PATH=%ENV_PREFIX%;%PATH%"
call "%ENV_PREFIX%\npm.cmd" run dev
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
