@echo off
setlocal EnableDelayedExpansion
 
echo ============================================================
echo   BEX HRIS - Iniciando servicios
echo ============================================================
echo.
 
set "BACKEND_DIR=C:\bex-hris\backend"
set "FRONTEND_DIR=C:\bex-hris\frontend"
set "NGINX_DIR=C:\nginx"
 
echo [0/3] Limpiando procesos anteriores...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
cmd /c "pm2 delete all" >nul 2>&1
echo       OK
 
echo [1/3] Iniciando Backend...
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c cd /d \"C:\bex-hris\backend\" ^&^& npm run dev >> \"C:\bex-hris\backend\dev.log\" 2^>^&1' -WindowStyle Hidden"
echo       OK - log en C:\bex-hris\backend\dev.log
 
echo [2/3] Iniciando Frontend...
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c cd /d \"C:\bex-hris\frontend\" ^&^& npm run dev >> \"C:\bex-hris\frontend\dev.log\" 2^>^&1' -WindowStyle Hidden"
echo       OK - log en C:\bex-hris\frontend\dev.log
 
echo [3/3] Iniciando Nginx...
tasklist /FI "IMAGENAME eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
if %errorLevel% EQU 0 (
    "%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -s reload
    echo       OK - Nginx recargado
) else (
    "%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%"
    echo       OK - Nginx iniciado
)
 
echo.
echo ============================================================
echo   Servicios corriendo en background.
echo   Acceso: http://192.168.0.2
echo.
echo   Logs:
echo   - Backend:  C:\bex-hris\backend\dev.log
echo   - Frontend: C:\bex-hris\frontend\dev.log
echo ============================================================
timeout /t 3 /nobreak >nul
start http://192.168.0.2