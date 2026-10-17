$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  docker compose -p video-downloader-local -f docker-compose.yml -f docker-compose.local.yml stop
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao parar os serviços.' }
} finally { Pop-Location }
