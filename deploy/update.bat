@echo off
echo ============================================================
echo   BEX HRIS - Actualizando sistema
echo ============================================================
echo.

set "DEPLOY_DIR=%~dp0"
pushd "%DEPLOY_DIR%.."
set "ROOT_DIR=%CD%"
popd

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

echo [1/3] Compilando backend...
cd /d "%BACKEND_DIR%"
cmd /c "npx tsc --noEmitOnError false"
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo la compilacion del backend. & pause & exit /b 1 )
cmd /c "npx tsc-alias"
echo       OK

echo [2/3] Compilando frontend...
cd /d "%FRONTEND_DIR%"
cmd /c "npm run build"
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo la compilacion del frontend. & pause & exit /b 1 )
echo       OK

echo [3/3] Reiniciando servicios...
cd /d "%BACKEND_DIR%"
cmd /c "pm2 restart bex-hris-backend"
echo       OK - Backend reiniciado con PM2

tasklist /FI "IMAGENAME eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
if %errorLevel% EQU 0 (
    "C:\nginx\nginx.exe" -s reload
    echo       OK - Nginx recargado
)

echo.
echo   Actualizacion completada.
timeout /t 2 /nobreak >nul
