<?php
/**
 * Hostinger-only secrets for clerk-exchange.php (login → Firebase bridge).
 *
 * 1. Copy this file to public_html/clerk-config.php on Hostinger
 * 2. Fill real values (never commit clerk-config.php)
 * 3. File survives FTP deploys (not in dist/) — clerk-exchange.php loads it first
 *
 * Clerk Dashboard → API Keys → Secret key (sk_live_… or sk_test_…)
 * Firebase Console → Project settings → Service accounts → Generate new private key
 *   → put project_id, client_email, and private_key as base64 (see below)
 */
return [
  'CLERK_SECRET_KEY' => 'sk_live_PASTE_HERE',
  'FIREBASE_PROJECT_ID' => 'your-firebase-project-id',
  'FIREBASE_CLIENT_EMAIL' => 'firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com',
  // PowerShell: [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content private_key.pem -Raw)))
  // Or: base64 -w0 private_key.pem
  'FIREBASE_PRIVATE_KEY_B64' => 'PASTE_BASE64_OF_PEM_INCLUDING_BEGIN_PRIVATE_KEY',
  'ADMIN_EMAIL' => 'sulemanmr551@gmail.com',
];
