@echo off
setlocal enabledelayedexpansion

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Node.js nao encontrado. Instale o Node.js antes de continuar.
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set ver=%%a
set ver=%ver:~1%
if %ver% LSS 20 (
  echo Versao do Node.js menor que 20. Atualize o Node.js para continuar.
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencias nao instaladas. Rode "npm install" primeiro.
  exit /b 1
)

echo Verificando integridade do banco...
node scripts\check-db-integrity.js
if %ERRORLEVEL% neq 0 (
  echo Falha na verificacao do banco. Rode "npm run db:migrate" e tente novamente.
  exit /b 1
)

if not exist ".next" (
  echo Build nao encontrado. Executando "npm run build"...
  npm run build
  if %ERRORLEVEL% neq 0 (
    echo Falha no build. Verifique os erros acima.
    exit /b 1
  )
)

echo Iniciando servidor...
start "" cmd /c "npm run start"

echo Aguardando o servidor em http://localhost:3000 ...
set /a attempts=0
set /a max=30
:wait_loop
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if %ERRORLEVEL% equ 0 goto ready
set /a attempts+=1
if %attempts% geq %max% (
  echo Nao foi possivel iniciar o servidor a tempo.
  exit /b 1
)
 timeout /t 1 >nul
 goto wait_loop

:ready
echo Servidor pronto. Abrindo navegador...
start "" "http://localhost:3000"

echo Pressione Ctrl+C para encerrar o servidor.
endlocal
