# One-time: Firebase CI token -> GitHub secret FIREBASE_TOKEN
# Run:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-firebase-token.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  if (Test-Path "C:\Program Files\GitHub CLI\gh.exe") {
    Set-Alias -Name gh -Value "C:\Program Files\GitHub CLI\gh.exe" -Scope Script
  } else {
    Write-Host "GitHub CLI missing. Install: winget install GitHub.cli"
    exit 1
  }
}

gh auth status | Out-Null

Write-Host ""
Write-Host "STEP 1: Neeche jo URL aaye, usko COPY karke Chrome/Edge mein kholo." -ForegroundColor Cyan
Write-Host "STEP 2: Google account Allow karo." -ForegroundColor Cyan
Write-Host "STEP 3: Jo CODE / TOKEN mile, wapas yahan paste karo." -ForegroundColor Cyan
Write-Host ""

# --no-localhost prints a URL instead of opening a browser
npx --yes firebase-tools@latest login:ci --no-localhost
if ($LASTEXITCODE -ne 0) {
  Write-Host "login:ci failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
$token = Read-Host "Firebase CI token yahan PASTE karo (pura line)"
$token = $token.Trim().Trim('"').Trim("'")

if ($token.Length -lt 20) {
  Write-Host "Token too short. Abort." -ForegroundColor Red
  exit 1
}

$token | gh secret set FIREBASE_TOKEN --repo bashayerlogistics-prog/web
Write-Host "SET FIREBASE_TOKEN" -ForegroundColor Green

Write-Host "Triggering Deploy Firebase..." -ForegroundColor Cyan
gh workflow run "Deploy Firebase" --repo bashayerlogistics-prog/web
Write-Host "Done. https://github.com/bashayerlogistics-prog/web/actions"
