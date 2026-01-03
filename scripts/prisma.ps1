param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$envPath = Join-Path (Get-Location) ".env.local"
if (!(Test-Path $envPath)) {
  Write-Host "Arquivo .env.local nao encontrado." -ForegroundColor Red
  exit 1
}

if (!(Test-Path -Path "prisma\\data")) {
  cmd.exe /c "mklink /J prisma\\data data" | Out-Null
}

Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $parts = $line -split "=", 2
  if ($parts.Length -eq 2) {
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

if (-not $Args -or $Args.Count -eq 0) {
  Write-Host "Uso: ./scripts/prisma.ps1 <comando> [args...]" -ForegroundColor Yellow
  Write-Host "Exemplo: ./scripts/prisma.ps1 migrate deploy" -ForegroundColor Yellow
  exit 1
}

& npx.cmd prisma @Args
exit $LASTEXITCODE
