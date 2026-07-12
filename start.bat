@echo off
cd /d "%~dp0"

:: Kill old process on port 9360
netstat -ano | find ":9360" | find "LISTENING" > "%TEMP%\sp.tmp" 2>nul
for /f "tokens=5" %%a in (%TEMP%\sp.tmp) do taskkill /F /PID %%a >nul 2>&1
del "%TEMP%\sp.tmp" 2>nul

echo SeaScribe -^> http://localhost:9360
echo   Admin: http://localhost:9360/admin/
python server.py 9360
