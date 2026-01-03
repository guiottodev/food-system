$envPath = Join-Path (Get-Location) ".env.local"
if (!(Test-Path $envPath)) {
  Write-Host "Arquivo .env.local nao encontrado." -ForegroundColor Red
  exit 1
}

$envMap = @{}
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $parts = $line -split "=", 2
  if ($parts.Length -eq 2) {
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    $envMap[$key] = $value
  }
}

$databaseUrl = $envMap["DATABASE_URL"]
Write-Host "DATABASE_URL=" $databaseUrl

$rootDbExists = Test-Path -Path "app.sqlite"
$dataDbExists = Test-Path -Path "data\app.sqlite"

if ($databaseUrl -ne "file:./data/app.sqlite") {
  Write-Host "DATABASE_URL nao esta configurado como file:./data/app.sqlite" -ForegroundColor Red
  exit 1
}

if ($rootDbExists) {
  Write-Host "Arquivo app.sqlite encontrado na raiz. Remova-o." -ForegroundColor Red
  exit 1
}

if (-not $dataDbExists) {
  Write-Host "Arquivo data\app.sqlite nao encontrado." -ForegroundColor Red
  exit 1
}

Write-Host "OK: caminho e arquivos do banco estao corretos." -ForegroundColor Green
