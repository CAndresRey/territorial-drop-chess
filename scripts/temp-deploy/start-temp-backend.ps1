param(
  [string]$Repo = 'CAndresRey/territorial-drop-chess',
  [int]$LocalPort = 3001,
  [switch]$UpdateGithubVariable,
  [switch]$TriggerPagesDeploy
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tempDir = Join-Path $repoRoot '.temp-deploy'
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$serverPidPath = Join-Path $tempDir 'server.pid'
$serverOutPath = Join-Path $tempDir 'server.out.log'
$serverErrPath = Join-Path $tempDir 'server.err.log'
$tunnelPidPath = Join-Path $tempDir 'tunnel.pid'
$tunnelOutPath = Join-Path $tempDir 'tunnel.out.log'
$tunnelErrPath = Join-Path $tempDir 'tunnel.err.log'
$tunnelUrlPath = Join-Path $tempDir 'tunnel.url'

function Test-Health([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Get-LiveProcess([string]$PidFile) {
  if (!(Test-Path $PidFile)) { return $null }
  $procId = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (!$procId) { return $null }
  return Get-Process -Id $procId -ErrorAction SilentlyContinue
}

function Resolve-CloudflaredPath() {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = 'C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe'
  if (Test-Path $candidate) { return $candidate }
  throw 'cloudflared not found. Install with: winget install --id Cloudflare.cloudflared -e'
}

$healthUrl = "http://127.0.0.1:$LocalPort/health"
$serverProc = Get-LiveProcess $serverPidPath
if (!$serverProc -or !(Test-Health $healthUrl)) {
  $serverProc = Start-Process `
    -FilePath 'powershell' `
    -ArgumentList '-NoProfile', '-Command', "Set-Location '$repoRoot'; npm run start --workspace @tdc/server" `
    -RedirectStandardOutput $serverOutPath `
    -RedirectStandardError $serverErrPath `
    -PassThru
  Set-Content -Path $serverPidPath -Value $serverProc.Id
}

$serverReady = $false
for ($i = 0; $i -lt 30; $i++) {
  if (Test-Health $healthUrl) {
    $serverReady = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (!$serverReady) {
  Write-Host 'Server log (tail):'
  if (Test-Path $serverOutPath) { Get-Content $serverOutPath -Tail 40 }
  if (Test-Path $serverErrPath) { Get-Content $serverErrPath -Tail 40 }
  throw "Server did not become healthy on $healthUrl"
}

$cloudflaredPath = Resolve-CloudflaredPath
$tunnelProc = Get-LiveProcess $tunnelPidPath
if (!$tunnelProc) {
  $tunnelProc = Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList 'tunnel', '--url', "http://localhost:$LocalPort", '--no-autoupdate' `
    -RedirectStandardOutput $tunnelOutPath `
    -RedirectStandardError $tunnelErrPath `
    -PassThru
  Set-Content -Path $tunnelPidPath -Value $tunnelProc.Id
}

$publicUrl = $null
for ($i = 0; $i -lt 40; $i++) {
  if (Test-Path $tunnelErrPath) {
    $content = Get-Content $tunnelErrPath -Raw
    $match = [regex]::Match($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
      $publicUrl = $match.Value
      break
    }
  }
  Start-Sleep -Seconds 1
}
if (!$publicUrl) {
  if (Test-Path $tunnelErrPath) { Get-Content $tunnelErrPath -Tail 40 }
  throw 'Could not extract tunnel URL from cloudflared logs.'
}

Set-Content -Path $tunnelUrlPath -Value $publicUrl

if ($UpdateGithubVariable) {
  & 'C:\Program Files\GitHub CLI\gh.exe' variable set VITE_SOCKET_URL --repo $Repo --body $publicUrl
}

if ($TriggerPagesDeploy) {
  & 'C:\Program Files\GitHub CLI\gh.exe' workflow run 'Deploy Web to GitHub Pages' --repo $Repo --ref master
}

Write-Output "Temporary backend ready: $publicUrl"
Write-Output "Health: $publicUrl/health"
