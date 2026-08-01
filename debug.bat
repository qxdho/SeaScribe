@echo off
setlocal
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

set PORT=9060

rem -- check if port is listening --
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 goto running

echo [INFO] Server not running, starting via start.bat (foreground window)...
start "SeaScribe Debug Server" cmd /c start.bat
set /a n=0

:wait
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 goto ready
timeout /t 1 /nobreak >nul
set /a n+=1
if %n% lss 15 goto wait

echo [ERROR] Server start timeout (15s), please run start.bat manually
set CODE=3
goto end

:running
echo [INFO] Server already running (http://127.0.0.1:%PORT%), start debug
goto debug

:ready
echo [INFO] Server ready

:debug
echo -- run debug_api.py --
python debug_api.py %*
set CODE=%errorlevel%

echo -- Debug done. Server is KEPT RUNNING, do not close it. --

:end
echo.
echo ============================================================
echo Debug exit code: %CODE%
echo Copy the results above, then type "exit" to close this window.
set /a tries=0
:confirm
set EXIT_INPUT=
set /p EXIT_INPUT=Type "exit" to close: 
if /i "%EXIT_INPUT%"=="exit" exit /b %CODE%
set /a tries+=1
if %tries% lss 10 goto confirm
exit /b %CODE%
