@echo off
setlocal
chcp 65001 >nul
title 暖通设计管家 - 局域网服务 (HVAC Design Master LAN Server)
cls
echo ========================================================
echo               暖通设计管家 - 局域网启动脚本
echo ========================================================
echo.

echo 正在检查构建文件...
if not exist "dist" (
    echo [错误] 找不到 'dist' 目录！
    echo 请先运行 build 命令或联系管理员。
    pause
    exit /b
)

echo.
echo 正在读取本机IP地址，请将以下显示的 IPv4 地址发给同事：
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceOperationalStatus Up | Where-Object {$_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1'} | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LAN_IP=%%I"
if not defined LAN_IP set "LAN_IP=127.0.0.1"
set "LAN_URL=http://%LAN_IP%:8080"
echo --------------------------------------------------------
echo IPv4: %LAN_IP%
echo 访问地址: %LAN_URL%
echo --------------------------------------------------------
echo.
echo [使用说明]
echo 同事在浏览器输入: %LAN_URL%
echo 例如: http://192.168.1.5:8080
echo.
echo 服务正在运行中... (请勿关闭此窗口)
echo.

pushd "%~dp0"
cd dist
start "" "%LAN_URL%"
conda run --no-capture-output -n hvac-design python -m http.server 8080 --bind 0.0.0.0
popd

pause