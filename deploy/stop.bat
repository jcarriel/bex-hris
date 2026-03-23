@echo off
echo ============================================================
echo   BEX HRIS - Deteniendo servicios
echo ============================================================
echo.

echo [1/2] Deteniendo Backend (PM2)...
pm2 stop bex-hris-backend >nul 2>&1
if %errorLevel% EQU 0 (
    echo       OK
) else (
    echo       El backend no estaba corriendo.
)

echo [2/2] Deteniendo Nginx...
taskkill /F /IM nginx.exe >nul 2>&1
if %errorLevel% EQU 0 (
    echo       OK
) else (
    echo       Nginx no estaba corriendo.
)

echo.
echo   Servicios detenidos.
timeout /t 2 /nobreak >nul
