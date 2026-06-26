@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   SeaScribe 启动中...
echo.
start http://localhost:9360
python server.py 9360
pause
