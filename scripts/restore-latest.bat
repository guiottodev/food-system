@echo off
setlocal

echo Feche o sistema antes de restaurar o backup.

if not exist "backups" (
  echo Pasta backups nao encontrada.
  exit /b 1
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-ChildItem -Path 'backups' -Filter 'app_*.sqlite' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"`) do set latest=%%i

if "%latest%"=="" (
  echo Nenhum backup encontrado em backups\.
  exit /b 1
)

if not exist "data" mkdir "data"
copy /y "%latest%" "data\app.sqlite" >nul
if %ERRORLEVEL% neq 0 (
  echo Falha ao restaurar o backup.
  exit /b 1
)

echo Backup restaurado: %latest%
endlocal
