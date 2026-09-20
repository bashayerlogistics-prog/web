<?php
/**
 * Clerk → Firebase custom-token bridge for Hostinger (no Firebase Blaze / Cloud Functions).
 *
 * Flow: Clerk sign-in → frontend getToken() → this file → Firebase signInWithCustomToken → /dashboard
 *
 * Secrets are injected on GitHub deploy (or local inject script). Do not commit real keys.
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
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

// === CONFIG (placeholders replaced on deploy) ===
const CLERK_SECRET_KEY = '__CLERK_SECRET_KEY__';
const FIREBASE_PROJECT_ID = '__FIREBASE_PROJECT_ID__';
const FIREBASE_CLIENT_EMAIL = '__FIREBASE_CLIENT_EMAIL__';
const FIREBASE_PRIVATE_KEY_B64 = '__FIREBASE_PRIVATE_KEY_B64__';
const ADMIN_EMAIL = 'sulemanmr551@gmail.com';
// ================================================

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

function b64urlDecode($data) {
  $remainder = strlen($data) % 4;
  if ($remainder) {
    $data .= str_repeat('=', 4 - $remainder);
  }
  return base64_decode(strtr($data, '-_', '+/'), true);
}

function requireBridgeConfig() {
  if (!isConfigured(CLERK_SECRET_KEY) || strpos(CLERK_SECRET_KEY, 'sk_') !== 0) {
    jsonExit(503, [
      'error' => 'Clerk secret is not configured on Hostinger.',
      'code' => 'failed-precondition',
    ]);
  }
  if (!isConfigured(FIREBASE_CLIENT_EMAIL) || !isConfigured(FIREBASE_PRIVATE_KEY_B64) || !isConfigured(FIREBASE_PROJECT_ID)) {
    jsonExit(503, [
      'error' => 'Firebase service account is not configured on Hostinger.',
      'code' => 'failed-precondition',
    ]);
  }
}

function firebasePem() {
  static $pem = null;
  if ($pem !== null) return $pem;
  $decoded = base64_decode(FIREBASE_PRIVATE_KEY_B64, true);
  if ($decoded === false || strpos($decoded, 'BEGIN') === false) {
    jsonExit(503, ['error' => 'Invalid Firebase private key.', 'code' => 'failed-precondition']);
  }
  $pem = $decoded;
  return $pem;
}

function firebaseAccessToken() {
  static $cached = null;
  if ($cached) return $cached;
  $now = time();
  $header = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $claim = b64url(json_encode([
    'iss' => FIREBASE_CLIENT_EMAIL,
    'sub' => FIREBASE_CLIENT_EMAIL,
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600,
    'scope' => 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
  ]));
  $unsigned = $header . '.' . $claim;
  $ok = openssl_sign($unsigned, $signature, firebasePem(), OPENSSL_ALGO_SHA256);
  if (!$ok) {
    jsonExit(500, ['error' => 'Could not sign Google access token.', 'code' => 'internal']);
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

function mintFirebaseCustomToken($uid, $claims = []) {
  $now = time();
  $payload = [
    'iss' => FIREBASE_CLIENT_EMAIL,
    'sub' => FIREBASE_CLIENT_EMAIL,
    'aud' => 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    'iat' => $now,
    'exp' => $now + 3600,
    'uid' => (string) $uid,
  ];
  if ($claims) {
    $payload['claims'] = $claims;
  }
  $header = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $claim = b64url(json_encode($payload));
  $unsigned = $header . '.' . $claim;
  $ok = openssl_sign($unsigned, $signature, firebasePem(), OPENSSL_ALGO_SHA256);
  if (!$ok) {
    jsonExit(500, ['error' => 'Could not mint Firebase custom token.', 'code' => 'internal']);
  }
  return $unsigned . '.' . b64url($signature);
}

function clerkHeaders() {
  return [
    'Authorization: Bearer ' . CLERK_SECRET_KEY,
    'Content-Type: application/json',
  ];
}

function resolveClerkUser($clerkToken) {
  $parts = explode('.', $clerkToken);
  if (count($parts) !== 3) {
    jsonExit(401, ['error' => 'Invalid Clerk session token.', 'code' => 'unauthenticated']);
  }
  $payloadRaw = b64urlDecode($parts[1]);
  $payload = is_string($payloadRaw) ? json_decode($payloadRaw, true) : null;
  if (!is_array($payload)) {
    jsonExit(401, ['error' => 'Invalid Clerk session token.', 'code' => 'unauthenticated']);
  }
  $sid = (string) ($payload['sid'] ?? '');
  $sub = (string) ($payload['sub'] ?? '');
  $exp = (int) ($payload['exp'] ?? 0);
  if ($sid === '' || $sub === '') {
    jsonExit(401, ['error' => 'Invalid Clerk session token.', 'code' => 'unauthenticated']);
  }
  if ($exp > 0 && $exp < time() - 30) {
    jsonExit(401, ['error' => 'Clerk session expired.', 'code' => 'unauthenticated']);
  }

  [$code, $session] = curlJson('https://api.clerk.com/v1/sessions/' . rawurlencode($sid), [
    'headers' => clerkHeaders(),
  ]);
  if ($code < 200 || $code >= 300 || !is_array($session)) {
    jsonExit(401, ['error' => 'Invalid Clerk session.', 'code' => 'unauthenticated']);
  }
  $status = (string) ($session['status'] ?? '');
  $sessionUser = (string) ($session['user_id'] ?? '');
  if ($status !== 'active' || $sessionUser === '' || $sessionUser !== $sub) {
    jsonExit(401, ['error' => 'Clerk session is not active.', 'code' => 'unauthenticated']);
  }

  [$userCode, $user] = curlJson('https://api.clerk.com/v1/users/' . rawurlencode($sub), [
    'headers' => clerkHeaders(),
  ]);
  if ($userCode < 200 || $userCode >= 300 || !is_array($user)) {
    jsonExit(401, ['error' => 'Could not load Clerk user.', 'code' => 'unauthenticated']);
  }
  return $user;
}

function clerkPrimaryEmail($clerkUser) {
  $primaryId = (string) ($clerkUser['primary_email_address_id'] ?? '');
  $emails = $clerkUser['email_addresses'] ?? [];
  if (!is_array($emails)) return '';
  foreach ($emails as $item) {
    if (!is_array($item)) continue;
    if ($primaryId && ($item['id'] ?? '') === $primaryId) {
      return strtolower(trim((string) ($item['email_address'] ?? '')));
    }
  }
  foreach ($emails as $item) {
    if (!is_array($item)) continue;
    $email = strtolower(trim((string) ($item['email_address'] ?? '')));
    if ($email !== '') return $email;
  }
  return '';
}

function identityToolkitUrl($method) {
  return 'https://identitytoolkit.googleapis.com/v1/projects/'
    . rawurlencode(FIREBASE_PROJECT_ID)
    . '/accounts' . $method;
}

function identityHeaders() {
  return [
    'Authorization: Bearer ' . firebaseAccessToken(),
    'Content-Type: application/json',
  ];
}

function lookupFirebaseUserByEmail($email) {
  [$code, $data] = curlJson(identityToolkitUrl(':lookup'), [
    'post' => true,
    'headers' => identityHeaders(),
    'body' => json_encode(['email' => [$email]]),
  ]);
  if ($code === 200 && !empty($data['users'][0]['localId'])) {
    return $data['users'][0];
  }
  return null;
}

function createFirebaseUser($email, $displayName) {
  $body = [
    'email' => $email,
    'emailVerified' => true,
    'disabled' => false,
  ];
  if ($displayName !== '') {
    $body['displayName'] = $displayName;
  }
  [$code, $data, $raw] = curlJson(identityToolkitUrl(''), [
    'post' => true,
    'headers' => identityHeaders(),
    'body' => json_encode($body),
  ]);
  if ($code < 200 || $code >= 300 || empty($data['localId'])) {
    jsonExit(502, [
      'error' => 'Could not create Firebase user.',
      'code' => 'internal',
      'detail' => is_array($data) ? $data : $raw,
    ]);
  }
  return $data;
}

function updateFirebaseUser($localId, $fields) {
  $body = array_merge(['localId' => $localId], $fields);
  curlJson(identityToolkitUrl(':update'), [
    'post' => true,
    'headers' => identityHeaders(),
    'body' => json_encode($body),
  ]);
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

function phpToFsFields($fields) {
  $timestampKeys = ['updatedAt' => true, 'createdAt' => true];
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

function firestoreDocUrl($path, $query = '') {
  $base = 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(FIREBASE_PROJECT_ID)
    . '/databases/(default)/documents/' . $path;
  return $query !== '' ? $base . '?' . $query : $base;
}

function upsertUserDocument($uid, $fields) {
  $mask = [];
  foreach (array_keys($fields) as $key) {
    $mask[] = 'updateMask.fieldPaths=' . rawurlencode($key);
  }
  $url = firestoreDocUrl('users/' . rawurlencode($uid), implode('&', $mask));
  curlJson($url, [
    'patch' => true,
    'headers' => [
      'Authorization: Bearer ' . firebaseAccessToken(),
      'Content-Type: application/json',
    ],
    'body' => json_encode(['fields' => phpToFsFields($fields)]),
  ]);
}

function addActivityLog($fields) {
  curlJson(firestoreDocUrl('activityLog'), [
    'post' => true,
    'headers' => [
      'Authorization: Bearer ' . firebaseAccessToken(),
      'Content-Type: application/json',
    ],
    'body' => json_encode(['fields' => phpToFsFields($fields)]),
  ]);
}

// --- main ---
requireBridgeConfig();

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input)) {
  jsonExit(400, ['error' => 'Invalid JSON body.', 'code' => 'invalid-argument']);
}

$clerkToken = trim((string) ($input['clerkToken'] ?? ''));
if ($clerkToken === '') {
  jsonExit(401, ['error' => 'Missing Clerk session token.', 'code' => 'unauthenticated']);
}

$clerkUser = resolveClerkUser($clerkToken);
$email = clerkPrimaryEmail($clerkUser);
if ($email === '') {
  jsonExit(400, ['error' => 'Clerk account has no email.', 'code' => 'failed-precondition']);
}
if ($email === ADMIN_EMAIL) {
  jsonExit(403, ['error' => 'Use the admin login for this account.', 'code' => 'permission-denied']);
}

$displayName = trim((string) ($input['displayName'] ?? ''));
if ($displayName === '') {
  $first = trim((string) ($clerkUser['first_name'] ?? ''));
  $last = trim((string) ($clerkUser['last_name'] ?? ''));
  $displayName = trim($first . ' ' . $last);
  if ($displayName === '') {
    $displayName = trim((string) ($clerkUser['username'] ?? ''));
  }
}
$phone = trim((string) ($input['phone'] ?? ''));
if ($phone === '' && !empty($clerkUser['unsafe_metadata']['phone'])) {
  $phone = trim((string) $clerkUser['unsafe_metadata']['phone']);
}
$authProvider = trim((string) ($input['authProvider'] ?? 'clerk'));
if ($authProvider === '') $authProvider = 'clerk';
$language = (($input['language'] ?? '') === 'en') ? 'en' : 'ar';
$clerkUserId = (string) ($clerkUser['id'] ?? '');
$photoURL = (string) ($clerkUser['image_url'] ?? '');

$existing = lookupFirebaseUserByEmail($email);
$isNew = false;
if ($existing) {
  if (!empty($existing['disabled'])) {
    jsonExit(403, ['error' => 'This account is disabled.', 'code' => 'permission-denied']);
  }
  $uid = (string) $existing['localId'];
  $updates = [];
  if (empty($existing['emailVerified'])) {
    $updates['emailVerified'] = true;
  }
  if ($displayName !== '' && ($existing['displayName'] ?? '') !== $displayName) {
    $updates['displayName'] = $displayName;
  }
  if ($updates) {
    updateFirebaseUser($uid, $updates);
  }
} else {
  $created = createFirebaseUser($email, $displayName);
  $uid = (string) $created['localId'];
  $isNew = true;
}

$nowIso = gmdate('Y-m-d\TH:i:s\Z');
$userDoc = [
  'email' => $email,
  'clerkUserId' => $clerkUserId,
  'authProvider' => $authProvider,
  'language' => $language,
  'updatedAt' => $nowIso,
];
if ($displayName !== '') $userDoc['displayName'] = $displayName;
if ($phone !== '') $userDoc['phone'] = $phone;
if ($photoURL !== '') $userDoc['photoURL'] = $photoURL;
if ($isNew) {
  $userDoc['createdAt'] = $nowIso;
  if ($phone === '') $userDoc['phone'] = '';
  if ($displayName === '') $userDoc['displayName'] = '';
}
upsertUserDocument($uid, $userDoc);

if ($isNew) {
  addActivityLog([
    'type' => 'user_registered',
    'userId' => $uid,
    'email' => $email,
    'authProvider' => $authProvider,
    'createdAt' => $nowIso,
  ]);
}

$token = mintFirebaseCustomToken($uid, [
  'authProvider' => $authProvider,
  'clerkUserId' => $clerkUserId,
]);

echo json_encode([
  'token' => $token,
  'isNew' => $isNew,
  'uid' => $uid,
]);
