# One-time: push local .env values into GitHub Actions secrets.
# Requires: GitHub CLI logged in (`gh auth login`)
# Does NOT set Hostinger FTP secrets — you add those once in GitHub UI.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Install GitHub CLI first: winget install GitHub.cli"
  exit 1
}

gh auth status | Out-Null

$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "Missing .env"
  exit 1
}

$keys = @(
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_SUPERADMIN_EMAIL",
  "VITE_SUPERADMIN_UID",
  "VITE_IMGBB_API_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_RESEND_WEBHOOK_URL",
  "VITE_EMAIL_WEBHOOK_SECRET",
  "VITE_RESEND_FROM_EMAIL"
)

$map = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $k = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
  $map[$k] = $v
}

foreach ($k in $keys) {
  if (-not $map.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($map[$k])) {
    Write-Host "SKIP $k (missing in .env)"
    continue
  }
  $map[$k] | gh secret set $k
  Write-Host "SET  $k"
}

# Firebase CI token
Write-Host "Creating FIREBASE_TOKEN..."
$token = npx --yes firebase-tools@latest login:ci --no-localhost 2>&1
# login:ci is interactive — prefer existing token file if present
if ($env:FIREBASE_TOKEN) {
  $env:FIREBASE_TOKEN | gh secret set FIREBASE_TOKEN
  Write-Host "SET  FIREBASE_TOKEN"
} else {
  Write-Host "SKIP FIREBASE_TOKEN — run: npx firebase login:ci"
  Write-Host "Then: gh secret set FIREBASE_TOKEN"
}

# Optional Resend from functions/.env or prompt
$resend = $env:RESEND_API_KEY
if (-not $resend -and (Test-Path (Join-Path $root "functions\.env"))) {
  Get-Content (Join-Path $root "functions\.env") | ForEach-Object {
    if ($_ -match '^RESEND_API_KEY=(.+)$') { $resend = $Matches[1].Trim().Trim('"') }
  }
}
if ($resend) {
  $resend | gh secret set RESEND_API_KEY
  Write-Host "SET  RESEND_API_KEY"
} else {
  Write-Host "SKIP RESEND_API_KEY — set manually or `$env:RESEND_API_KEY='re_...' then re-run"
}

Write-Host ""
Write-Host "Done with .env secrets."
Write-Host "STILL ADD IN GITHUB UI (Hostinger FTP):"
Write-Host "  HOSTINGER_FTP_HOST"
Write-Host "  HOSTINGER_FTP_USER"
Write-Host "  HOSTINGER_FTP_PASSWORD"
Write-Host "  HOSTINGER_FTP_PATH = public_html/"
