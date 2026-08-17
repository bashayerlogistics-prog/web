<?php
/**
 * Free Resend relay for Hostinger (no Firebase Blaze).
 * Upload to public_html, e.g. https://yourdomain.com/resend-send.php
 *
 * 1) Create API key at https://resend.com/api-keys
 * 2) Set RESEND_API_KEY below (or Hostinger env if available)
 * 3) Set WEBHOOK_SECRET to match VITE_EMAIL_WEBHOOK_SECRET in the app
 * 4) Put this URL in Admin → Payment email webhook OR VITE_RESEND_WEBHOOK_URL
 */

header('Content-Type: application/json; charset=utf-8');

$allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://bashayer-logistics.com',
  'https://www.bashayer-logistics.com',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowedOrigins, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Webhook-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

// === CONFIG ===
// Local/manual: replace placeholders below.
// GitHub Actions: secrets RESEND_API_KEY + VITE_EMAIL_WEBHOOK_SECRET are injected on deploy.
const RESEND_API_KEY = '__RESEND_API_KEY__';
const WEBHOOK_SECRET = '__WEBHOOK_SECRET__';
const DEFAULT_FROM = 'Bashayer Al-Ataa <onboarding@resend.dev>'; // after domain verify: Name <noreply@yourdomain.com>
// ==============

$secretHeader = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
if (WEBHOOK_SECRET && !hash_equals(WEBHOOK_SECRET, $secretHeader)) {
  http_response_code(401);
  echo json_encode(['error' => 'Unauthorized']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

$to = trim((string)($data['to'] ?? ''));
$subject = trim((string)($data['subject'] ?? ''));
$html = (string)($data['html'] ?? '');
$fromEmail = trim((string)($data['from'] ?? ''));
$fromName = trim((string)($data['fromName'] ?? 'Bashayer Al-Ataa'));
$replyTo = trim((string)($data['replyTo'] ?? ''));

if ($to === '' || $subject === '' || $html === '') {
  http_response_code(400);
  echo json_encode(['error' => 'to, subject, html required']);
  exit;
}

$from = DEFAULT_FROM;
if ($fromEmail !== '') {
  $safeName = str_replace(['"', "\n", "\r"], '', $fromName !== '' ? $fromName : 'Bashayer Al-Ataa');
  $from = "{$safeName} <{$fromEmail}>";
}

$payload = [
  'from' => $from,
  'to' => [$to],
  'subject' => $subject,
  'html' => $html,
];
if ($replyTo !== '') {
  $payload['reply_to'] = $replyTo;
}

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . RESEND_API_KEY,
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode($payload),
  CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['error' => $err ?: 'curl failed']);
  exit;
}

http_response_code($status >= 100 ? $status : 502);
echo $response;
