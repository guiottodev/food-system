@echo off
setlocal

if not exist "backups" mkdir "backups"
if not exist "data\app.sqlite" (
  echo Banco de dados nao encontrado em data\app.sqlite.
  exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set ts=%%i
set dest=backups\app_%ts%.sqlite

copy /y "data\app.sqlite" "%dest%" >nul
if %ERRORLEVEL% neq 0 (
  echo Falha ao criar backup.
  exit /b 1
)

echo Backup criado: %dest%
endlocal
