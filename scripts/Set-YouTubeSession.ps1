param([Parameter(Mandatory = $true)][string]$CookiesFile, [switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$sourcePath = (Resolve-Path -LiteralPath $CookiesFile).Path
$lines = [System.IO.File]::ReadAllLines($sourcePath)
if (!$lines.Count -or $lines[0] -notmatch '^# (Netscape HTTP Cookie File|HTTP Cookie File)') {
  throw 'O arquivo precisa estar no formato Netscape cookies.txt.'
}
$selected = [System.Collections.Generic.List[string]]::new()
$selected.Add('# Netscape HTTP Cookie File')
foreach ($line in $lines) {
  if (!$line.Trim() -or ($line.StartsWith('#') -and !$line.StartsWith('#HttpOnly_'))) { continue }
  $fields = $line -split "`t"
  if ($fields.Count -ne 7) { throw 'Arquivo de cookies invalido.' }
  $domain = ($fields[0] -replace '^#HttpOnly_', '').TrimStart('.').ToLowerInvariant()
  if ($domain -eq 'youtube.com' -or $domain.EndsWith('.youtube.com')) { $selected.Add($line) }
}
if ($selected.Count -lt 2) { throw 'Nenhum cookie do YouTube foi encontrado.' }
if ($ValidateOnly) {
  Write-Host ('Arquivo valido: {0} cookie(s) do YouTube selecionado(s).' -f ($selected.Count - 1))
  return
}
$sessionDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force -Path $sessionDirectory | Out-Null
$destination = Join-Path $sessionDirectory 'youtube.cookies.txt'
[System.IO.File]::WriteAllLines($destination, $selected, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Sessao do YouTube salva apenas na pasta local ignorada pelo Git.'
& (Join-Path $PSScriptRoot 'Start-LocalApi.ps1')
