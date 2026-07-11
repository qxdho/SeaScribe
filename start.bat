@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo SeaScribe -> http://localhost:9360
python server.py 9360
