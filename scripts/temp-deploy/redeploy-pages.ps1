param(
  [string]$Repo = 'CAndresRey/territorial-drop-chess'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tempDir = Join-Path $repoRoot '.temp-deploy'
$tunnelUrlPath = Join-Path $tempDir 'tunnel.url'

if (!(Test-Path $tunnelUrlPath)) {
  throw "Missing $tunnelUrlPath. Run start-temp-backend.ps1 first."
}

$url = (Get-Content $tunnelUrlPath -ErrorAction Stop | Select-Object -First 1).Trim()
if (!$url) {
  throw 'Tunnel URL is empty.'
}

& 'C:\Program Files\GitHub CLI\gh.exe' variable set VITE_SOCKET_URL --repo $Repo --body $url
$runOutput = & 'C:\Program Files\GitHub CLI\gh.exe' workflow run 'Deploy Web to GitHub Pages' --repo $Repo --ref master

Write-Output "VITE_SOCKET_URL updated: $url"
Write-Output "Pages deploy triggered: $runOutput"
