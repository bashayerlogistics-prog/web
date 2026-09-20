# One-shot local inject for Hostinger PHP bridges (manual ZIP upload).
# Run in interactive PowerShell AFTER building:
#   npm run hostinger
#   powershell -ExecutionPolicy Bypass -File .\scripts\inject-hostinger-local.ps1
#
# Requires:
#   CLERK_SECRET_KEY          (or prompt)
#   FIREBASE_SERVICE_ACCOUNT  (path to JSON, or env JSON string)
# Optional:
#   MOYASAR_SECRET_KEY, RESEND_API_KEY, WEBHOOK_SECRET

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$upload = Join-Path (Get-Location) 'hostinger-upload'
if (-not (Test-Path (Join-Path $upload 'clerk-exchange.php'))) {
  Write-Host 'hostinger-upload/clerk-exchange.php missing. Run: npm run hostinger' -ForegroundColor Red
  exit 1
}

$clerkSecret = $env:CLERK_SECRET_KEY
if (-not $clerkSecret) {
  $clerkSecret = Read-Host 'Paste Clerk Secret key (sk_test_... or sk_live_...)'
}
if (-not $clerkSecret -or $clerkSecret -notmatch '^sk_') {
  throw 'CLERK_SECRET_KEY must start with sk_'
}

$saPath = $env:FIREBASE_SERVICE_ACCOUNT_FILE
$saRaw = $env:FIREBASE_SERVICE_ACCOUNT
if (-not $saRaw) {
  if (-not $saPath) {
    $saPath = Read-Host 'Path to Firebase service account JSON file'
  }
  if (-not (Test-Path $saPath)) {
    throw "Service account file not found: $saPath"
  }
  $saRaw = Get-Content -Raw -Path $saPath
}

$env:CLERK_SECRET_KEY = $clerkSecret
$env:FIREBASE_SERVICE_ACCOUNT = $saRaw
if (-not $env:MOYASAR_SECRET_KEY) { $env:MOYASAR_SECRET_KEY = '' }
if (-not $env:RESEND_API_KEY) { $env:RESEND_API_KEY = '' }
if (-not $env:WEBHOOK_SECRET) { $env:WEBHOOK_SECRET = '' }

# Work on hostinger-upload copies (same placeholders as dist/)
New-Item -ItemType Directory -Force -Path 'dist' | Out-Null
Copy-Item (Join-Path $upload 'moyasar-verify.php') (Join-Path 'dist' 'moyasar-verify.php') -Force
Copy-Item (Join-Path $upload 'clerk-exchange.php') (Join-Path 'dist' 'clerk-exchange.php') -Force

python scripts/inject-hostinger-php.py
if ($LASTEXITCODE -ne 0) {
  # Fallback when Python is missing on Windows
  node scripts/inject-hostinger-local.mjs
  if ($LASTEXITCODE -ne 0) { throw 'inject failed (python + node)' }
} else {
  Copy-Item (Join-Path 'dist' 'moyasar-verify.php') (Join-Path $upload 'moyasar-verify.php') -Force
  Copy-Item (Join-Path 'dist' 'clerk-exchange.php') (Join-Path $upload 'clerk-exchange.php') -Force
}

# Quick sanity: placeholders gone
$clerkBody = Get-Content -Raw (Join-Path $upload 'clerk-exchange.php')
if ($clerkBody -match '__CLERK_SECRET_KEY__' -or $clerkBody -match '__FIREBASE_PRIVATE_KEY_B64__') {
  throw 'Inject failed — placeholders still present in clerk-exchange.php'
}

Write-Host ''
Write-Host 'Inject OK. Re-zip and upload:' -ForegroundColor Green
Write-Host '  npm run zip:hostinger'
Write-Host 'Then upload hostinger-upload.zip to public_html (replace old files).'
Write-Host 'Also add Clerk allowed origin + redirect: https://bashayer-logistics.com/sso-callback'
