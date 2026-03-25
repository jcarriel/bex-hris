@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   BEX HRIS - Iniciando servicios
echo ============================================================
echo.

set "DEPLOY_DIR=%~dp0"
pushd "%DEPLOY_DIR%.."
set "ROOT_DIR=%CD%"
popd

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "NGINX_DIR=C:\nginx"

if not exist "%ROOT_DIR%\frontend\dist\index.html" (
    echo [ERROR] Frontend no compilado. Ejecuta SETUP.BAT primero.
    pause & exit /b 1
)
if not exist "%BACKEND_DIR%\dist\index.js" (
    echo [ERROR] Backend no compilado. Ejecuta SETUP.BAT primero.
    pause & exit /b 1
)
if not exist "%NGINX_DIR%\nginx.exe" (
    echo [ERROR] Nginx no encontrado. Ejecuta SETUP.BAT primero.
    pause & exit /b 1
)

echo [1/2] Iniciando Backend con PM2...
cd /d "%BACKEND_DIR%"
cmd /c "pm2 describe bex-hris-backend" >nul 2>&1
if %errorLevel% EQU 0 (
    cmd /c "pm2 restart bex-hris-backend"
) else (
    cmd /c "pm2 start server.js --name bex-hris-backend"
)
echo       OK

echo [2/2] Iniciando Nginx...
tasklist /FI "IMAGENAME eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
if %errorLevel% EQU 0 (
    "%NGINX_DIR%\nginx.exe" -s reload
    echo       OK - Nginx recargado
) else (
    start "Nginx" /min "%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%"
    echo       OK - Nginx iniciado
)

:: Obtener IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4.*192\." 2^>nul') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :show
)
:show
echo.
echo ============================================================
echo   Sistema iniciado correctamente.
echo.
echo   Este equipo:   http://bex-hris.com.ec
echo   Otra PC red:   http://!LOCAL_IP!
echo ============================================================
echo.
timeout /t 1 /nobreak >nul
start http://bex-hris.com.ec
