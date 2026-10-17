param([switch]$ConnectPages)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$previousCookiesPath = $env:YT_DLP_COOKIES_FILE
Push-Location $projectRoot
try {
  if (Test-Path -LiteralPath (Join-Path $projectRoot '.local/youtube.cookies.txt')) {
    $env:YT_DLP_COOKIES_FILE = '/app/local/youtube.cookies.txt'
  }
  $compose = @('compose', '-p', 'video-downloader-local', '-f', 'docker-compose.yml', '-f', 'docker-compose.local.yml')
  & docker @compose up --detach --build
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar os serviços. Confira se o Docker Desktop está aberto.' }
  $deadline = (Get-Date).AddMinutes(2)
  $apiReady = $false
  do {
    try {
      $health = Invoke-RestMethod 'http://127.0.0.1:3001/api/health' -TimeoutSec 3
      $apiReady = $health.status -eq 'ok'
    } catch { Start-Sleep -Seconds 2 }
  } until ($apiReady -or (Get-Date) -gt $deadline)
  if (!$apiReady) { throw 'A API não respondeu. Consulte: docker compose -p video-downloader-local -f docker-compose.yml -f docker-compose.local.yml logs backend' }
  $publicUrl = $null
  do {
    $tunnelLog = (& docker @compose logs --no-color --tail 100 tunnel 2>&1 | Out-String)
    $matchesFound = [regex]::Matches($tunnelLog, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($matchesFound.Count) { $publicUrl = $matchesFound[$matchesFound.Count - 1].Value }
    if (!$publicUrl) { Start-Sleep -Seconds 2 }
  } until ($publicUrl -or (Get-Date) -gt $deadline)
  if (!$publicUrl) { throw 'O túnel não forneceu um endereço. Consulte os logs do serviço tunnel.' }
  $publicReady = $false
  $deadline = (Get-Date).AddMinutes(2)
  do {
    try {
      $health = Invoke-RestMethod "$publicUrl/api/health" -TimeoutSec 5
      $publicReady = $health.status -eq 'ok'
    } catch { Start-Sleep -Seconds 3 }
  } until ($publicReady -or (Get-Date) -gt $deadline)
  if (!$publicReady) { throw 'A API local está ativa, mas o túnel ainda não respondeu.' }
  Write-Host 'API local: http://localhost:3001/api'
  Write-Host "API HTTPS: $publicUrl/api"
  if ($ConnectPages) {
    & gh variable set VITE_API_BASE_URL --body "$publicUrl/api" --repo NeyvanSantos/Downloads-Audio-e-Video-
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar a variável do GitHub.' }
    & gh workflow run deploy.yml --ref main --repo NeyvanSantos/Downloads-Audio-e-Video-
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao solicitar a publicação do site.' }
    Write-Host 'Publicação solicitada. Aguarde o workflow terminar antes de usar o site.'
  }
} finally {
  $env:YT_DLP_COOKIES_FILE = $previousCookiesPath
  Pop-Location
}
