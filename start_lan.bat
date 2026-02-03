@echo off
setlocal
chcp 65001 >nul
title 暖通设计管家 - 局域网服务 (HVAC Design Master LAN Server)
cls
echo ========================================================
echo               暖通设计管家 - 局域网启动脚本
echo ========================================================
echo.
echo正在检查构建文件...
if not exist "dist" (
    echo [错误] 找不到 'dist' 目录！
    echo 请先运行 build 命令或联系管理员。
    pause
    exit /b
)

echo.
echo 正在读取本机IP地址，请将以下显示的 IPv4 地址发给同事：
echo --------------------------------------------------------
ipconfig | findstr "IPv4"
echo --------------------------------------------------------
echo.
echo [使用说明]
echo 同事在浏览器输入: http://[你的IP]:8080
echo 例如: http://192.168.1.5:8080
echo.
echo 服务正在运行中... (请勿关闭此窗口)
echo.

cd dist
python -m http.server 8080 --bind 0.0.0.0

pause
