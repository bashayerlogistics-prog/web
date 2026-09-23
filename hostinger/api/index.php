<?php
/**
 * Bashayer CMS API — Hostinger shared hosting (MySQL + local uploads).
 * Public GET is open; writes need header X-Admin-Key.
 *
 * Routes:
 *   GET  /api/index.php?action=health
 *   GET  /api/index.php?action=home
 *   GET  /api/index.php?action=vehicles
 *   GET  /api/index.php?action=packages
 *   GET  /api/index.php?action=collection&name=services
 *   GET  /api/index.php?action=settings&id=homepage
 *   GET  /api/index.php?action=revision
 *   POST /api/index.php?action=vehicle_upsert   (admin)
 *   POST /api/index.php?action=package_upsert   (admin)
 *   POST /api/index.php?action=settings_upsert  (admin)
 *   POST /api/index.php?action=upload           (admin multipart)
 *   POST /api/index.php?action=bump_revision    (admin)
 */

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Missing api/config.php — copy config.sample.php']);
  exit;
}

$config = require $configFile;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $config['allowed_origins'] ?? [], true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function json_out($payload, $code = 200) {
  http_response_code($code);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function db_connect(array $config): PDO {
  $db = $config['db'];
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $db['host'], $db['name'], $db['charset'] ?? 'utf8mb4');
  $pdo = new PDO($dsn, $db['user'], $db['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function require_admin(array $config): void {
  $key = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
  if (!$key || !hash_equals((string) $config['admin_key'], (string) $key)) {
    json_out(['ok' => false, 'error' => 'unauthorized'], 401);
  }
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function bump_revision(PDO $pdo): int {
  $pdo->exec('UPDATE content_revision SET revision = revision + 1 WHERE id = 1');
  $rev = (int) $pdo->query('SELECT revision FROM content_revision WHERE id = 1')->fetchColumn();
  return $rev;
}

try {
  $pdo = db_connect($config);
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'db_connect_failed', 'detail' => $e->getMessage()], 500);
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'health';

if ($action === 'health') {
  json_out(['ok' => true, 'backend' => 'mysql', 'time' => gmdate('c')]);
}

if ($action === 'revision') {
  $rev = (int) $pdo->query('SELECT revision FROM content_revision WHERE id = 1')->fetchColumn();
  json_out(['ok' => true, 'revision' => $rev]);
}

if ($action === 'vehicles') {
  $rows = $pdo->query('SELECT * FROM vehicles WHERE active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
  $out = array_map(function ($r) {
    $extra = $r['data_json'] ? json_decode($r['data_json'], true) : [];
    $forms = $r['forms_json'] ? json_decode($r['forms_json'], true) : null;
    return array_merge(is_array($extra) ? $extra : [], [
      'id' => $r['id'],
      'nameEn' => $r['name_en'],
      'nameAr' => $r['name_ar'],
      'modelEn' => $r['model_en'],
      'modelAr' => $r['model_ar'],
      'imageUrl' => $r['image_url'],
      'passengers' => (int) $r['passengers'],
      'vip' => (bool) $r['vip'],
      'sortOrder' => (int) $r['sort_order'],
      'active' => (bool) $r['active'],
      'forms' => $forms,
      'updatedAt' => $r['updated_at'],
    ]);
  }, $rows);
  json_out(['ok' => true, 'items' => $out]);
}

if ($action === 'packages') {
  $activeOnly = ($_GET['all'] ?? '') !== '1';
  $sql = $activeOnly
    ? 'SELECT * FROM packages WHERE active = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM packages ORDER BY sort_order ASC, id ASC';
  $rows = $pdo->query($sql)->fetchAll();
  $out = [];
  foreach ($rows as $r) {
    $extra = $r['data_json'] ? json_decode($r['data_json'], true) : [];
    $out[] = array_merge(is_array($extra) ? $extra : [], [
      'id' => $r['id'],
      'routeId' => $r['route_id'],
      'vehicleKey' => $r['vehicle_key'],
      'fleetServiceId' => $r['fleet_service_id'],
      'tripType' => $r['trip_type'],
      'bookingFormId' => $r['booking_form_id'],
      'nameEn' => $r['name_en'],
      'nameAr' => $r['name_ar'],
      'imageUrl' => $r['image_url'],
      'price' => $r['price'] !== null ? (float) $r['price'] : null,
      'originalPrice' => $r['original_price'] !== null ? (float) $r['original_price'] : null,
      'pickupPrice' => $r['pickup_price'] !== null ? (float) $r['pickup_price'] : null,
      'dropoffPrice' => $r['dropoff_price'] !== null ? (float) $r['dropoff_price'] : null,
      'hourlyRate' => $r['hourly_rate'] !== null ? (float) $r['hourly_rate'] : null,
      'hours' => $r['hours'] !== null ? (int) $r['hours'] : null,
      'passengers' => $r['passengers'] !== null ? (int) $r['passengers'] : null,
      'hidePrice' => (bool) $r['hide_price'],
      'active' => (bool) $r['active'],
      'sortOrder' => (int) $r['sort_order'],
      'updatedAt' => $r['updated_at'],
    ]);
  }
  json_out(['ok' => true, 'items' => $out, 'count' => count($out)]);
}

if ($action === 'collection') {
  $name = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['name'] ?? ''));
  if ($name === '') json_out(['ok' => false, 'error' => 'name_required'], 400);
  $stmt = $pdo->prepare('SELECT id, data_json, active, sort_order, updated_at FROM content_rows WHERE collection = ? AND active = 1 ORDER BY sort_order ASC');
  $stmt->execute([$name]);
  $items = [];
  foreach ($stmt->fetchAll() as $r) {
    $data = json_decode($r['data_json'], true) ?: [];
    $data['id'] = $r['id'];
    $data['active'] = (bool) $r['active'];
    $data['sortOrder'] = (int) $r['sort_order'];
    $data['updatedAt'] = $r['updated_at'];
    $items[] = $data;
  }
  json_out(['ok' => true, 'items' => $items]);
}

if ($action === 'settings') {
  $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['id'] ?? ''));
  if ($id === '') {
    $rows = $pdo->query('SELECT id, data_json, updated_at FROM site_settings')->fetchAll();
    $map = [];
    foreach ($rows as $r) {
      $map[$r['id']] = json_decode($r['data_json'], true);
    }
    json_out(['ok' => true, 'settings' => $map]);
  }
  $stmt = $pdo->prepare('SELECT data_json FROM site_settings WHERE id = ?');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  json_out(['ok' => true, 'id' => $id, 'data' => $row ? json_decode($row['data_json'], true) : null]);
}

if ($action === 'home') {
  $vehicles = $pdo->query('SELECT id, name_en, name_ar, image_url, passengers, vip, sort_order, forms_json, updated_at FROM vehicles WHERE active = 1 ORDER BY sort_order ASC')->fetchAll();
  $packages = $pdo->query('SELECT id, route_id, vehicle_key, fleet_service_id, trip_type, name_en, name_ar, image_url, price, original_price, pickup_price, dropoff_price, hourly_rate, hours, passengers, hide_price, sort_order, data_json, updated_at FROM packages WHERE active = 1 ORDER BY sort_order ASC')->fetchAll();
  $homepage = null;
  $branding = null;
  $stmt = $pdo->prepare('SELECT data_json FROM site_settings WHERE id = ?');
  $stmt->execute(['homepage']);
  $row = $stmt->fetch();
  if ($row) $homepage = json_decode($row['data_json'], true);
  $stmt->execute(['branding']);
  $row = $stmt->fetch();
  if ($row) $branding = json_decode($row['data_json'], true);
  $rev = (int) $pdo->query('SELECT revision FROM content_revision WHERE id = 1')->fetchColumn();
  json_out([
    'ok' => true,
    'revision' => $rev,
    'homepage' => $homepage,
    'branding' => $branding,
    'vehicles' => array_map(function ($r) {
      return [
        'id' => $r['id'],
        'nameEn' => $r['name_en'],
        'nameAr' => $r['name_ar'],
        'imageUrl' => $r['image_url'],
        'passengers' => (int) $r['passengers'],
        'vip' => (bool) $r['vip'],
        'sortOrder' => (int) $r['sort_order'],
        'forms' => $r['forms_json'] ? json_decode($r['forms_json'], true) : null,
        'updatedAt' => $r['updated_at'],
      ];
    }, $vehicles),
    'packages' => array_map(function ($r) {
      $extra = $r['data_json'] ? json_decode($r['data_json'], true) : [];
      return array_merge(is_array($extra) ? $extra : [], [
        'id' => $r['id'],
        'routeId' => $r['route_id'],
        'vehicleKey' => $r['vehicle_key'],
        'fleetServiceId' => $r['fleet_service_id'],
        'tripType' => $r['trip_type'],
        'nameEn' => $r['name_en'],
        'nameAr' => $r['name_ar'],
        'imageUrl' => $r['image_url'],
        'price' => $r['price'] !== null ? (float) $r['price'] : null,
        'originalPrice' => $r['original_price'] !== null ? (float) $r['original_price'] : null,
        'pickupPrice' => $r['pickup_price'] !== null ? (float) $r['pickup_price'] : null,
        'dropoffPrice' => $r['dropoff_price'] !== null ? (float) $r['dropoff_price'] : null,
        'active' => true,
        'updatedAt' => $r['updated_at'],
      ]);
    }, $packages),
  ]);
}

/* -------- Admin writes -------- */

if ($action === 'bump_revision') {
  require_admin($config);
  json_out(['ok' => true, 'revision' => bump_revision($pdo)]);
}

if ($action === 'vehicle_upsert') {
  require_admin($config);
  $body = read_json_body();
  $id = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($body['id'] ?? '')));
  if ($id === '') json_out(['ok' => false, 'error' => 'id_required'], 400);
  $imageUrl = (string) ($body['imageUrl'] ?? '');
  $stmt = $pdo->prepare('INSERT INTO vehicles
    (id, name_en, name_ar, model_en, model_ar, image_url, passengers, vip, sort_order, active, forms_json, data_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      name_en=VALUES(name_en), name_ar=VALUES(name_ar), model_en=VALUES(model_en), model_ar=VALUES(model_ar),
      image_url=VALUES(image_url), passengers=VALUES(passengers), vip=VALUES(vip), sort_order=VALUES(sort_order),
      active=VALUES(active), forms_json=VALUES(forms_json), data_json=VALUES(data_json)');
  $stmt->execute([
    $id,
    (string) ($body['nameEn'] ?? ''),
    (string) ($body['nameAr'] ?? ''),
    (string) ($body['modelEn'] ?? $body['nameEn'] ?? ''),
    (string) ($body['modelAr'] ?? $body['nameAr'] ?? ''),
    $imageUrl,
    (int) ($body['passengers'] ?? 4),
    !empty($body['vip']) ? 1 : 0,
    (int) ($body['sortOrder'] ?? 0),
    ($body['active'] ?? true) ? 1 : 0,
    json_encode($body['forms'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
    json_encode($body, JSON_UNESCAPED_UNICODE),
  ]);

  // Fast image push to all packages for this car
  if ($imageUrl !== '' && !empty($body['syncPackages'])) {
    $u = $pdo->prepare('UPDATE packages SET image_url = ? WHERE vehicle_key = ? OR vehicle_key LIKE ?');
    $u->execute([$imageUrl, $id, $id . '-%']);
  }

  $rev = bump_revision($pdo);
  json_out(['ok' => true, 'id' => $id, 'revision' => $rev]);
}

if ($action === 'settings_upsert') {
  require_admin($config);
  $body = read_json_body();
  $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($body['id'] ?? ''));
  if ($id === '') json_out(['ok' => false, 'error' => 'id_required'], 400);
  $data = $body['data'] ?? $body;
  unset($data['id']);
  $merge = !empty($body['merge']);
  if ($merge) {
    $cur = $pdo->prepare('SELECT data_json FROM site_settings WHERE id = ?');
    $cur->execute([$id]);
    $row = $cur->fetch();
    $prev = $row ? json_decode($row['data_json'], true) : [];
    if (!is_array($prev)) $prev = [];
    $data = array_merge($prev, is_array($data) ? $data : []);
  }
  $stmt = $pdo->prepare('INSERT INTO site_settings (id, data_json) VALUES (?,?)
    ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)');
  $stmt->execute([$id, json_encode($data, JSON_UNESCAPED_UNICODE)]);
  json_out(['ok' => true, 'id' => $id, 'revision' => bump_revision($pdo)]);
}

if ($action === 'package_upsert') {
  require_admin($config);
  $body = read_json_body();
  $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($body['id'] ?? ''));
  if ($id === '') {
    $id = 'pkg_' . bin2hex(random_bytes(8));
  }
  $prevRow = null;
  $prevData = [];
  $sel = $pdo->prepare('SELECT * FROM packages WHERE id = ?');
  $sel->execute([$id]);
  $prevRow = $sel->fetch();
  if ($prevRow) {
    $prevData = $prevRow['data_json'] ? json_decode($prevRow['data_json'], true) : [];
    if (!is_array($prevData)) $prevData = [];
  }
  $merged = array_merge($prevData, $body, ['id' => $id]);
  $routeId = (string) ($merged['routeId'] ?? $merged['route_id'] ?? ($prevRow['route_id'] ?? ''));
  $vehicleKey = (string) ($merged['vehicleKey'] ?? $merged['vehicle_key'] ?? ($prevRow['vehicle_key'] ?? ''));
  $fleetServiceId = (string) ($merged['fleetServiceId'] ?? $merged['fleet_service_id'] ?? ($prevRow['fleet_service_id'] ?? ''));
  $tripType = (string) ($merged['tripType'] ?? $merged['trip_type'] ?? ($prevRow['trip_type'] ?? ''));
  $bookingFormId = (string) ($merged['bookingFormId'] ?? $merged['booking_form_id'] ?? ($prevRow['booking_form_id'] ?? ''));
  $nameEn = (string) ($merged['nameEn'] ?? $merged['name_en'] ?? ($prevRow['name_en'] ?? ''));
  $nameAr = (string) ($merged['nameAr'] ?? $merged['name_ar'] ?? ($prevRow['name_ar'] ?? ''));
  $imageUrl = (string) ($merged['imageUrl'] ?? $merged['image_url'] ?? ($prevRow['image_url'] ?? ''));
  $price = array_key_exists('price', $merged) ? $merged['price'] : ($prevRow['price'] ?? null);
  $originalPrice = array_key_exists('originalPrice', $merged) ? $merged['originalPrice'] : ($prevRow['original_price'] ?? null);
  $pickupPrice = array_key_exists('pickupPrice', $merged) ? $merged['pickupPrice'] : ($prevRow['pickup_price'] ?? null);
  $dropoffPrice = array_key_exists('dropoffPrice', $merged) ? $merged['dropoffPrice'] : ($prevRow['dropoff_price'] ?? null);
  $hourlyRate = array_key_exists('hourlyRate', $merged) ? $merged['hourlyRate'] : ($prevRow['hourly_rate'] ?? null);
  $hours = array_key_exists('hours', $merged) ? $merged['hours'] : ($prevRow['hours'] ?? null);
  $passengers = array_key_exists('passengers', $merged) ? $merged['passengers'] : ($prevRow['passengers'] ?? null);
  $hidePrice = !empty($merged['hidePrice']) ? 1 : (int) ($prevRow['hide_price'] ?? 0);
  $active = array_key_exists('active', $merged) ? (!empty($merged['active']) ? 1 : 0) : (int) ($prevRow['active'] ?? 1);
  $sortOrder = (int) ($merged['sortOrder'] ?? $merged['sort_order'] ?? ($prevRow['sort_order'] ?? 0));

  $stmt = $pdo->prepare('INSERT INTO packages
    (id, route_id, vehicle_key, fleet_service_id, trip_type, booking_form_id, name_en, name_ar, image_url,
     price, original_price, pickup_price, dropoff_price, hourly_rate, hours, passengers, hide_price, active, sort_order, data_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      route_id=VALUES(route_id), vehicle_key=VALUES(vehicle_key), fleet_service_id=VALUES(fleet_service_id),
      trip_type=VALUES(trip_type), booking_form_id=VALUES(booking_form_id), name_en=VALUES(name_en), name_ar=VALUES(name_ar),
      image_url=VALUES(image_url), price=VALUES(price), original_price=VALUES(original_price),
      pickup_price=VALUES(pickup_price), dropoff_price=VALUES(dropoff_price), hourly_rate=VALUES(hourly_rate),
      hours=VALUES(hours), passengers=VALUES(passengers), hide_price=VALUES(hide_price),
      active=VALUES(active), sort_order=VALUES(sort_order), data_json=VALUES(data_json)');
  $stmt->execute([
    $id, $routeId, $vehicleKey, $fleetServiceId, $tripType, $bookingFormId, $nameEn, $nameAr, $imageUrl,
    $price, $originalPrice, $pickupPrice, $dropoffPrice, $hourlyRate, $hours, $passengers,
    $hidePrice, $active, $sortOrder,
    json_encode($merged, JSON_UNESCAPED_UNICODE),
  ]);
  json_out(['ok' => true, 'id' => $id, 'revision' => bump_revision($pdo)]);
}

if ($action === 'package_delete') {
  require_admin($config);
  $body = read_json_body();
  $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($body['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') json_out(['ok' => false, 'error' => 'id_required'], 400);
  $stmt = $pdo->prepare('DELETE FROM packages WHERE id = ?');
  $stmt->execute([$id]);
  json_out(['ok' => true, 'id' => $id, 'revision' => bump_revision($pdo)]);
}

if ($action === 'upload') {
  require_admin($config);
  if (empty($_FILES['file'])) json_out(['ok' => false, 'error' => 'file_required'], 400);
  $file = $_FILES['file'];
  if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    json_out(['ok' => false, 'error' => 'upload_error', 'code' => $file['error']], 400);
  }
  $dir = $config['upload_dir'];
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
  if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
    json_out(['ok' => false, 'error' => 'bad_extension'], 400);
  }
  $folder = preg_replace('/[^a-z0-9_-]/', '', strtolower((string) ($_POST['folder'] ?? 'cms'))) ?: 'cms';
  $sub = $dir . '/' . $folder;
  if (!is_dir($sub)) mkdir($sub, 0755, true);
  $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
  $dest = $sub . '/' . $name;
  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_out(['ok' => false, 'error' => 'move_failed'], 500);
  }
  $url = rtrim($config['upload_url_base'], '/') . '/' . $folder . '/' . $name;
  json_out(['ok' => true, 'url' => $url]);
}

json_out(['ok' => false, 'error' => 'unknown_action', 'action' => $action], 404);
