<?php
/**
 * Free Moyasar payment verify for Hostinger (no Firebase Blaze / Cloud Functions).
 *
 * Flow: checkout → Moyasar → /payment/return → this file → Firestore paymentStatus=paid
 *
 * GitHub Actions injects secrets on deploy. Do not commit real keys.
 *
 * Webhook (optional): Moyasar Dashboard → https://YOUR-DOMAIN.com/moyasar-verify.php
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

// === CONFIG (placeholders replaced on GitHub deploy) ===
const MOYASAR_SECRET_KEY = '__MOYASAR_SECRET_KEY__';
const RESEND_API_KEY = '__RESEND_API_KEY__';
const WEBHOOK_SECRET = '__WEBHOOK_SECRET__';
const FIREBASE_PROJECT_ID = '__FIREBASE_PROJECT_ID__';
const FIREBASE_CLIENT_EMAIL = '__FIREBASE_CLIENT_EMAIL__';
const FIREBASE_PRIVATE_KEY_B64 = '__FIREBASE_PRIVATE_KEY_B64__';
// =======================================================

function isConfigured($value) {
  return is_string($value) && $value !== '' && strpos($value, '__') !== 0;
}

function jsonExit($status, $payload) {
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

function curlJson($url, $opts = []) {
  $ch = curl_init($url);
  $headers = $opts['headers'] ?? [];
  $curlOpts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => $headers,
  ];
  if (!empty($opts['post'])) {
    $curlOpts[CURLOPT_POST] = true;
    $curlOpts[CURLOPT_POSTFIELDS] = $opts['body'] ?? '';
  }
  if (!empty($opts['patch'])) {
    $curlOpts[CURLOPT_CUSTOMREQUEST] = 'PATCH';
    $curlOpts[CURLOPT_POSTFIELDS] = $opts['body'] ?? '';
  }
  curl_setopt_array($ch, $curlOpts);
  $raw = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($raw === false) {
    return [0, null, $err ?: 'curl failed'];
  }
  $data = json_decode($raw, true);
  return [$code, is_array($data) ? $data : null, $raw];
}

function b64url($data) {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function firebaseAccessToken() {
  static $cached = null;
  if ($cached) return $cached;
  if (!isConfigured(FIREBASE_CLIENT_EMAIL) || !isConfigured(FIREBASE_PRIVATE_KEY_B64) || !isConfigured(FIREBASE_PROJECT_ID)) {
    jsonExit(503, [
      'error' => 'Firebase service account is not configured on Hostinger.',
      'code' => 'failed-precondition',
    ]);
  }
  $pem = base64_decode(FIREBASE_PRIVATE_KEY_B64, true);
  if ($pem === false || strpos($pem, 'BEGIN') === false) {
    jsonExit(503, ['error' => 'Invalid Firebase private key.', 'code' => 'failed-precondition']);
  }
  $now = time();
  $header = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $claim = b64url(json_encode([
    'iss' => FIREBASE_CLIENT_EMAIL,
    'sub' => FIREBASE_CLIENT_EMAIL,
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600,
    'scope' => 'https://www.googleapis.com/auth/datastore',
  ]));
  $unsigned = $header . '.' . $claim;
  $ok = openssl_sign($unsigned, $signature, $pem, OPENSSL_ALGO_SHA256);
  if (!$ok) {
    jsonExit(500, ['error' => 'Could not sign Firebase token.', 'code' => 'internal']);
  }
  $jwt = $unsigned . '.' . b64url($signature);
  [$code, $data] = curlJson('https://oauth2.googleapis.com/token', [
    'post' => true,
    'headers' => ['Content-Type: application/x-www-form-urlencoded'],
    'body' => http_build_query([
      'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion' => $jwt,
    ]),
  ]);
  $token = is_array($data) ? ($data['access_token'] ?? '') : '';
  if ($code < 200 || $code >= 300 || $token === '') {
    jsonExit(502, ['error' => 'Firebase auth failed.', 'code' => 'internal']);
  }
  $cached = $token;
  return $cached;
}

function fsValueToPhp($value) {
  if (!is_array($value)) return null;
  if (array_key_exists('stringValue', $value)) return $value['stringValue'];
  if (array_key_exists('integerValue', $value)) return 0 + $value['integerValue'];
  if (array_key_exists('doubleValue', $value)) return (float) $value['doubleValue'];
  if (array_key_exists('booleanValue', $value)) return (bool) $value['booleanValue'];
  if (array_key_exists('timestampValue', $value)) return $value['timestampValue'];
  if (array_key_exists('nullValue', $value)) return null;
  if (isset($value['mapValue']['fields']) && is_array($value['mapValue']['fields'])) {
    return fsFieldsToPhp($value['mapValue']['fields']);
  }
  if (isset($value['arrayValue']['values']) && is_array($value['arrayValue']['values'])) {
    $out = [];
    foreach ($value['arrayValue']['values'] as $item) {
      $out[] = fsValueToPhp($item);
    }
    return $out;
  }
  if (isset($value['arrayValue'])) return [];
  return null;
}

function fsFieldsToPhp($fields) {
  $out = [];
  if (!is_array($fields)) return $out;
  foreach ($fields as $key => $value) {
    $out[$key] = fsValueToPhp($value);
  }
  return $out;
}

function phpToFsValue($value) {
  if ($value === null) return ['nullValue' => null];
  if (is_bool($value)) return ['booleanValue' => $value];
  if (is_int($value)) return ['integerValue' => (string) $value];
  if (is_float($value)) return ['doubleValue' => $value];
  if (is_array($value)) {
    $isList = $value === [] || array_keys($value) === range(0, count($value) - 1);
    if ($isList) {
      $values = [];
      foreach ($value as $item) {
        $values[] = phpToFsValue($item);
      }
      return ['arrayValue' => $values ? ['values' => $values] : new stdClass()];
    }
    $fields = [];
    foreach ($value as $key => $item) {
      $fields[$key] = phpToFsValue($item);
    }
    return ['mapValue' => ['fields' => $fields]];
  }
  return ['stringValue' => (string) $value];
}

function firestoreUrl($path, $query = '') {
  $base = 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(FIREBASE_PROJECT_ID)
    . '/databases/(default)/documents/' . $path;
  return $query !== '' ? $base . '?' . $query : $base;
}

function firestoreHeaders() {
  return [
    'Authorization: Bearer ' . firebaseAccessToken(),
    'Content-Type: application/json',
  ];
}

function getBooking($bookingId) {
  [$code, $data] = curlJson(firestoreUrl('bookings/' . rawurlencode($bookingId)), [
    'headers' => firestoreHeaders(),
  ]);
  if ($code === 404) {
    jsonExit(404, ['error' => 'Booking not found.', 'code' => 'not-found']);
  }
  if ($code < 200 || $code >= 300 || empty($data['fields'])) {
    jsonExit(502, ['error' => 'Could not load booking.', 'code' => 'internal']);
  }
  $booking = fsFieldsToPhp($data['fields']);
  $booking['id'] = $bookingId;
  return $booking;
}

function phpToFsFields($fields) {
  $timestampKeys = ['updatedAt' => true, 'createdAt' => true, 'paidAt' => true];
  $fsFields = [];
  foreach ($fields as $key => $value) {
    if (isset($timestampKeys[$key]) && is_string($value) && $value !== '') {
      $fsFields[$key] = ['timestampValue' => $value];
    } else {
      $fsFields[$key] = phpToFsValue($value);
    }
  }
  return $fsFields;
}

function patchBooking($bookingId, $fields) {
  $mask = [];
  foreach (array_keys($fields) as $key) {
    $mask[] = 'updateMask.fieldPaths=' . rawurlencode($key);
  }
  $url = firestoreUrl('bookings/' . rawurlencode($bookingId), implode('&', $mask));
  [$code, $data, $raw] = curlJson($url, [
    'patch' => true,
    'headers' => firestoreHeaders(),
    'body' => json_encode(['fields' => phpToFsFields($fields)]),
  ]);
  if ($code < 200 || $code >= 300) {
    jsonExit(502, ['error' => 'Could not update booking.', 'code' => 'internal', 'detail' => is_array($data) ? $data : $raw]);
  }
}

function addFirestoreDoc($collection, $fields) {
  curlJson(firestoreUrl($collection), [
    'post' => true,
    'headers' => firestoreHeaders(),
    'body' => json_encode(['fields' => phpToFsFields($fields)]),
  ]);
}

function paymentAlreadyUsed($paymentId, $bookingId) {
  $body = json_encode([
    'structuredQuery' => [
      'from' => [['collectionId' => 'bookings']],
      'where' => [
        'fieldFilter' => [
          'field' => ['fieldPath' => 'paymentId'],
          'op' => 'EQUAL',
          'value' => ['stringValue' => $paymentId],
        ],
      ],
      'limit' => 1,
    ],
  ]);
  [$code, $data] = curlJson(
    'https://firestore.googleapis.com/v1/projects/' . rawurlencode(FIREBASE_PROJECT_ID)
      . '/databases/(default)/documents:runQuery',
    [
      'post' => true,
      'headers' => firestoreHeaders(),
      'body' => $body,
    ]
  );
  if ($code < 200 || $code >= 300 || !is_array($data)) return;
  foreach ($data as $row) {
    $name = $row['document']['name'] ?? '';
    if ($name === '') continue;
    $parts = explode('/', $name);
    $foundId = end($parts);
    if ($foundId && $foundId !== $bookingId) {
      jsonExit(409, [
        'error' => 'This payment was already used for another order.',
        'code' => 'failed-precondition',
      ]);
    }
  }
}

function sarToHalalas($amountSar) {
  $n = (float) $amountSar;
  if (!is_numeric($amountSar) || $n <= 0 || is_nan($n) || is_infinite($n)) return 0;
  return (int) round($n * 100);
}

function fetchMoyasarPayment($paymentId) {
  if (!isConfigured(MOYASAR_SECRET_KEY) || strpos(MOYASAR_SECRET_KEY, 'sk_') !== 0) {
    jsonExit(503, [
      'error' => 'Moyasar secret key is not configured on Hostinger.',
      'code' => 'failed-precondition',
    ]);
  }
  $auth = base64_encode(MOYASAR_SECRET_KEY . ':');
  [$code, $data] = curlJson('https://api.moyasar.com/v1/payments/' . rawurlencode($paymentId), [
    'headers' => [
      'Authorization: Basic ' . $auth,
      'Accept: application/json',
    ],
  ]);
  if ($code < 200 || $code >= 300 || !is_array($data)) {
    jsonExit(404, ['error' => 'Payment could not be verified with Moyasar.', 'code' => 'not-found']);
  }
  return $data;
}

function isoNow() {
  return gmdate('Y-m-d\TH:i:s\Z');
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
  jsonExit(400, ['error' => 'Invalid JSON']);
}

$paymentId = trim((string) (
  $input['paymentId']
  ?? $input['id']
  ?? ($input['data']['id'] ?? '')
));
$bookingId = trim((string) (
  $input['bookingId']
  ?? ($input['metadata']['bookingId'] ?? '')
  ?? ($input['data']['metadata']['bookingId'] ?? '')
));

$isAppCall = isset($input['bookingId']) && isset($input['paymentId']);
if ($isAppCall && isConfigured(WEBHOOK_SECRET)) {
  $secretHeader = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
  if (!hash_equals(WEBHOOK_SECRET, $secretHeader)) {
    jsonExit(401, ['error' => 'Unauthorized']);
  }
}

if ($paymentId === '') {
  jsonExit(400, ['error' => 'Missing payment ID.', 'code' => 'invalid-argument']);
}

$payment = fetchMoyasarPayment($paymentId);
$metaBookingId = trim((string) (
  ($payment['metadata']['bookingId'] ?? '')
  ?: ($payment['metadata']['booking_id'] ?? '')
));
if ($bookingId === '' && $metaBookingId !== '') {
  $bookingId = $metaBookingId;
}
if ($bookingId === '') {
  jsonExit(400, ['error' => 'Missing booking ID.', 'code' => 'invalid-argument']);
}
if ($metaBookingId !== '' && $metaBookingId !== $bookingId) {
  jsonExit(409, [
    'error' => 'Payment does not belong to this booking.',
    'code' => 'failed-precondition',
  ]);
}

$booking = getBooking($bookingId);
$status = strtolower((string) ($payment['status'] ?? ''));
$orderNumber = $booking['orderNumber'] ?? null;

if (($booking['paymentStatus'] ?? '') === 'paid') {
  if (($booking['paymentId'] ?? '') === $paymentId || $booking['paymentId'] === '') {
    jsonExit(200, [
      'status' => 'paid',
      'bookingId' => $bookingId,
      'orderNumber' => $orderNumber,
      'paymentId' => $booking['paymentId'] ?: $paymentId,
    ]);
  }
  jsonExit(409, ['error' => 'This booking is already paid.', 'code' => 'failed-precondition']);
}

if (in_array($status, ['failed', 'voided'], true)) {
  patchBooking($bookingId, [
    'paymentStatus' => 'failed',
    'paymentProvider' => 'moyasar',
    'paymentId' => $paymentId,
    'updatedAt' => isoNow(),
  ]);
  jsonExit(200, ['status' => 'failed', 'bookingId' => $bookingId, 'paymentId' => $paymentId]);
}

if (!in_array($status, ['paid', 'captured'], true)) {
  patchBooking($bookingId, [
    'paymentId' => $paymentId,
    'paymentProvider' => 'moyasar',
    'paymentMethod' => 'moyasar',
    'updatedAt' => isoNow(),
  ]);
  jsonExit(200, ['status' => 'pending', 'bookingId' => $bookingId, 'paymentId' => $paymentId]);
}

$expectedHalalas = sarToHalalas($booking['totalPrice'] ?? $booking['price'] ?? 0);
$amountHalalas = (int) ($payment['amount'] ?? 0);
$currency = strtoupper((string) ($payment['currency'] ?? 'SAR'));
if ($expectedHalalas < 100) {
  jsonExit(409, ['error' => 'Invalid booking amount.', 'code' => 'failed-precondition']);
}
if ($amountHalalas !== $expectedHalalas) {
  jsonExit(409, ['error' => 'Payment amount does not match the order total.', 'code' => 'failed-precondition']);
}
if ($currency !== 'SAR') {
  jsonExit(409, ['error' => 'Payment currency must be SAR.', 'code' => 'failed-precondition']);
}

paymentAlreadyUsed($paymentId, $bookingId);

$timeline = isset($booking['trackingTimeline']) && is_array($booking['trackingTimeline'])
  ? $booking['trackingTimeline']
  : [];
$timeline[] = [
  'status' => 'paid',
  'label' => 'Moyasar payment verified',
  'at' => isoNow(),
];

$nextStatus = (($booking['status'] ?? '') === 'cancelled') ? 'cancelled' : 'confirmed';
$paidAt = $payment['updated_at'] ?? $payment['created_at'] ?? isoNow();
$reference = $payment['source']['reference_number'] ?? $payment['id'] ?? $paymentId;

patchBooking($bookingId, [
  'paymentStatus' => 'paid',
  'status' => $nextStatus,
  'paymentMethod' => 'moyasar',
  'paymentProvider' => 'moyasar',
  'paymentId' => $paymentId,
  'transactionReference' => (string) $reference,
  'amount' => (float) ($booking['totalPrice'] ?? $booking['price'] ?? 0),
  'currency' => 'SAR',
  'paidAt' => $paidAt,
  'updatedAt' => isoNow(),
  'trackingTimeline' => $timeline,
]);

function formatOrderDisplay($orderNumber) {
  if ($orderNumber === null || $orderNumber === '') return '';
  return str_pad((string) $orderNumber, 3, '0', STR_PAD_LEFT);
}

function sendPaymentConfirmedEmail($booking, $orderNumber) {
  $to = strtolower(trim((string) ($booking['customerEmail'] ?? '')));
  if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) return;
  if (!isConfigured(RESEND_API_KEY)) return;

  $orderDisplay = formatOrderDisplay($orderNumber);
  $name = htmlspecialchars((string) ($booking['customerName'] ?? ''), ENT_QUOTES, 'UTF-8');
  $html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7">'
    . '<h2>تم تأكيد الدفع والحجز' . ($orderDisplay !== '' ? ' #' . $orderDisplay : '') . '</h2>'
    . '<p>مرحباً ' . $name . '،</p>'
    . '<p>تم تأكيد دفعتك بنجاح. حجزك الآن <strong>مؤكد</strong>.</p>'
    . '<hr>'
    . '<div dir="ltr" style="font-family:Arial,sans-serif">'
    . '<h2>Payment &amp; Booking Confirmed' . ($orderDisplay !== '' ? ' #' . $orderDisplay : '') . '</h2>'
    . '<p>Hello ' . $name . ',</p>'
    . '<p>Your payment is confirmed. Your booking is now <strong>confirmed</strong>.</p>'
    . '</div></div>';

  $subject = $orderDisplay !== ''
    ? 'تم تأكيد الدفع والحجز #' . $orderDisplay . ' / Payment confirmed #' . $orderDisplay
    : 'تم تأكيد الدفع والحجز / Payment confirmed';

  curlJson('https://api.resend.com/emails', [
    'post' => true,
    'headers' => [
      'Authorization: Bearer ' . RESEND_API_KEY,
      'Content-Type: application/json',
    ],
    'body' => json_encode([
      'from' => 'Bashayer Al-Ataa <onboarding@resend.dev>',
      'to' => [$to],
      'subject' => $subject,
      'html' => $html,
    ]),
  ]);
}

try {
  $userId = (string) ($booking['userId'] ?? '');
  if ($userId !== '') {
    addFirestoreDoc('notifications', [
      'userId' => $userId,
      'type' => 'payment_update',
      'title' => 'Payment Confirmed',
      'titleAr' => 'تم تأكيد الدفع',
      'message' => 'Your payment is confirmed and your booking is active.',
      'messageAr' => 'تم تأكيد دفعتك وحجزك نشط الآن.',
      'bookingId' => $bookingId,
      'read' => false,
      'createdAt' => isoNow(),
    ]);
  }
  addFirestoreDoc('activityLog', [
    'type' => 'payment_confirmed',
    'bookingId' => $bookingId,
    'paymentId' => $paymentId,
    'provider' => 'moyasar',
    'createdAt' => isoNow(),
  ]);
  sendPaymentConfirmedEmail($booking, $orderNumber);
} catch (Throwable $e) {
  // Booking is already paid; extra docs/emails are optional.
}

jsonExit(200, [
  'status' => 'paid',
  'bookingId' => $bookingId,
  'orderNumber' => $orderNumber,
  'paymentId' => $paymentId,
]);
