@echo off
cd /d "%~dp0"

:: Set SEASCRIBE_DATA to use external data directory (for server deployment)
:: set SEASCRIBE_DATA=/path/to/seascribe-data

:: Kill old process on port 9360
netstat -ano | find ":9360" | find "LISTENING" > "%TEMP%\sp.tmp" 2>nul
for /f "tokens=5" %%a in (%TEMP%\sp.tmp) do taskkill /F /PID %%a >nul 2>&1
del "%TEMP%\sp.tmp" 2>nul

echo SeaScribe -^> http://localhost:9360
echo   Admin: http://localhost:9360/admin/
python main/server.py 9360
