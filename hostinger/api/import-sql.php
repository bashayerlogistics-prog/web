<?php
/**
 * ONE-TIME: upload bashayer-mysql-import.sql next to this file, open in browser once, then DELETE.
 * https://bashayer-logistics.com/api/import-sql.php?key=YOUR_ADMIN_KEY
 */
header('Content-Type: text/plain; charset=utf-8');

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
  http_response_code(500);
  echo "Missing config.php\n";
  exit;
}
$config = require $configFile;
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals((string) $config['admin_key'], (string) $key)) {
  http_response_code(401);
  echo "Unauthorized\n";
  exit;
}

$sqlFile = __DIR__ . '/bashayer-mysql-import.sql';
if (!is_file($sqlFile)) {
  http_response_code(404);
  echo "Place bashayer-mysql-import.sql in /api/ first\n";
  exit;
}

$db = $config['db'];
$mysqli = @new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
if ($mysqli->connect_errno) {
  http_response_code(500);
  echo 'Connect failed: ' . $mysqli->connect_error . "\n";
  exit;
}
$mysqli->set_charset('utf8mb4');

$sql = file_get_contents($sqlFile);
if ($sql === false || $sql === '') {
  echo "Empty SQL file\n";
  exit;
}

$ok = 0;
$fail = 0;
if ($mysqli->multi_query($sql)) {
  do {
    if ($result = $mysqli->store_result()) {
      $result->free();
    }
    $ok += 1;
    if ($mysqli->errno) {
      $fail += 1;
      echo 'ERR: ' . $mysqli->error . "\n";
    }
  } while ($mysqli->more_results() && $mysqli->next_result());
} else {
  echo 'multi_query failed: ' . $mysqli->error . "\n";
  exit;
}

echo "Done. batches≈$ok fails=$fail\n";
echo "DELETE this file and bashayer-mysql-import.sql from the server now.\n";
$mysqli->close();
