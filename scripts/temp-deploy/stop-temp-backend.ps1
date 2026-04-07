param(
  [int]$LocalPort = 3001
)

$ErrorActionPreference = 'Continue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tempDir = Join-Path $repoRoot '.temp-deploy'

function Stop-FromPidFile([string]$PidFile) {
  if (!(Test-Path $PidFile)) { return }
  $procId = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($procId) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

Stop-FromPidFile (Join-Path $tempDir 'server.pid')
Stop-FromPidFile (Join-Path $tempDir 'tunnel.pid')

# Best-effort fallback in case wrappers changed pid ownership.
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$listen = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($listen) {
  Stop-Process -Id $listen.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Output 'Temporary backend processes stopped.'
