@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   BEX HRIS - Instalacion inicial
echo ============================================================
echo.

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Este script requiere permisos de Administrador.
    echo Clic derecho sobre setup.bat ^> "Ejecutar como administrador"
    pause
    exit /b 1
)

set "DEPLOY_DIR=%~dp0"
pushd "%DEPLOY_DIR%.."
set "ROOT_DIR=%CD%"
popd

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "NGINX_DIR=C:\nginx"
set "NGINX_CONF=%NGINX_DIR%\conf\nginx.conf"
set "FRONTEND_DIST=%FRONTEND_DIR%\dist"

echo [1/8] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Node.js no esta instalado. Descargalo desde https://nodejs.org/
    pause
    exit /b 1
)
echo       OK

echo.
echo [2/8] Verificando Nginx...
if not exist "%NGINX_DIR%\nginx.exe" (
    echo [ERROR] Nginx no encontrado en %NGINX_DIR%
    echo         Descarga desde https://nginx.org/en/download.html
    echo         Extrae en C:\nginx
    pause
    exit /b 1
)
echo       OK

echo.
echo [3/8] Instalando PM2...
call npm install -g pm2 >nul 2>&1
pm2 --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] No se pudo instalar PM2.
    pause
    exit /b 1
)
echo       OK - PM2 instalado

echo.
echo [4/8] Instalando dependencias y compilando backend...
cd /d "%BACKEND_DIR%"
call npm install
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo npm install del backend. & pause & exit /b 1 )
call npx tsc --noEmitOnError false
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo la compilacion del backend. & pause & exit /b 1 )
call npx tsc-alias
echo       OK

echo.
echo [5/8] Instalando dependencias y compilando frontend...
cd /d "%FRONTEND_DIR%"
call npm install
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo npm install del frontend. & pause & exit /b 1 )
call npm run build
if %errorLevel% NEQ 0 ( echo [ERROR] Fallo la compilacion del frontend. & pause & exit /b 1 )
echo       OK

echo.
echo [6/8] Configurando Nginx...
set "DIST_PATH_ESCAPED=%FRONTEND_DIST:\=/%"

:: Obtener la IP local del equipo
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4.*192\." 2^>nul') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :got_ip
)
:got_ip
if "!LOCAL_IP!"=="" set "LOCAL_IP=127.0.0.1"
echo       IP detectada: !LOCAL_IP!

powershell -Command "$c = Get-Content '%DEPLOY_DIR%nginx.conf'; $c = $c -replace 'FRONTEND_DIST_PATH', '%DIST_PATH_ESCAPED%'; $c | Set-Content '%NGINX_CONF%'"
echo       OK - nginx.conf configurado

echo.
echo [7/8] Configurando PM2 para inicio automatico con Windows...
cd /d "%BACKEND_DIR%"
call pm2 delete bex-hris-backend >nul 2>&1
call pm2 start server.js --name bex-hris-backend
call pm2 save
:: Registrar PM2 como servicio Windows (usando pm2-windows-startup si disponible)
call npm install -g pm2-windows-startup >nul 2>&1
call pm2-startup install >nul 2>&1
echo       OK

echo.
echo [8/8] Configurando hosts y firewall...
set "HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts"

:: Entrada local
findstr /C:"bex-hris.com.ec" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% NEQ 0 (
    echo 127.0.0.1    bex-hris.com.ec >> "%HOSTS_FILE%"
    echo       OK - hosts local configurado
) else (
    echo       hosts local ya configurado
)

:: Abrir puerto 80 en el firewall para acceso desde la red local
netsh advfirewall firewall show rule name="BEX-HRIS HTTP" >nul 2>&1
if %errorLevel% NEQ 0 (
    netsh advfirewall firewall add rule name="BEX-HRIS HTTP" dir=in action=allow protocol=TCP localport=80
    echo       OK - Puerto 80 abierto en el firewall
) else (
    echo       Regla de firewall ya existe
)

echo.
echo ============================================================
echo   Instalacion completada.
echo.
echo   Acceso local:     http://bex-hris.com.ec
echo   Acceso en red:    http://!LOCAL_IP!
echo.
echo   Para acceder desde otra PC en la red, visitar:
echo   http://!LOCAL_IP!
echo   (no requiere configuracion adicional en la otra PC)
echo ============================================================
pause
