# One-shot: secrets + deploy for Clerk bridge + order emails
# Run in an interactive PowerShell (after `npx firebase login`):
#   powershell -ExecutionPolicy Bypass -File .\scripts\finish-auth-deploy.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== Bashayer auth / email deploy ==" -ForegroundColor Cyan

$login = npx firebase login:list 2>&1 | Out-String
if ($login -match 'No authorized accounts') {
  Write-Host "Firebase CLI not logged in. Run: npx firebase login" -ForegroundColor Red
  exit 1
}

function Set-SecretFromValue([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing value for secret $Name"
  }
  $tmp = Join-Path $env:TEMP "fb-secret-$Name.txt"
  try {
    [System.IO.File]::WriteAllText($tmp, $Value)
    npx firebase functions:secrets:set $Name --data-file $tmp
    if ($LASTEXITCODE -ne 0) { throw "Failed setting secret $Name" }
    Write-Host "Set $Name" -ForegroundColor Green
  } finally {
    Remove-Item -Force $tmp -ErrorAction SilentlyContinue
  }
}

$clerkSecret = $env:CLERK_SECRET_KEY
if (-not $clerkSecret) {
  $clerkSecret = Read-Host 'Paste Clerk Secret key (sk_test_... or sk_live_...)'
}

$smtpUser = $env:SMTP_USER
if (-not $smtpUser) { $smtpUser = 'bashayer.logistics@gmail.com' }

$smtpPass = $env:SMTP_PASSWORD
if (-not $smtpPass) {
  $smtpPass = Read-Host 'Paste Gmail App Password for order emails (SMTP_PASSWORD)'
}

$otpPepper = $env:OTP_PEPPER
if (-not $otpPepper) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $otpPepper = ([Convert]::ToBase64String($bytes))
}

Write-Host "Setting Firebase secrets..." -ForegroundColor Yellow
Set-SecretFromValue 'CLERK_SECRET_KEY' $clerkSecret
Set-SecretFromValue 'SMTP_USER' $smtpUser
Set-SecretFromValue 'SMTP_PASSWORD' $smtpPass
Set-SecretFromValue 'OTP_PEPPER' $otpPepper

Write-Host "Deploying Firestore rules..." -ForegroundColor Yellow
npx firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) { throw 'Rules deploy failed' }

Write-Host "Deploying Cloud Functions..." -ForegroundColor Yellow
npx firebase deploy --only functions
if ($LASTEXITCODE -ne 0) { throw 'Functions deploy failed' }

Write-Host "`nDone. Test:" -ForegroundColor Green
Write-Host "1) /login email OTP (Clerk sends code)"
Write-Host "2) /register then name+phone save"
Write-Host "3) Place order -> customer email via deliverEmailQueue"
Write-Host "4) Admin confirm payment -> payment received email"
Write-Host "`nClerk Google: Dashboard -> SSO connections -> enable Google + redirect /sso-callback"
