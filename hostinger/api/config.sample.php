<?php
/**
 * Copy to config.php on Hostinger OR inject via GitHub Actions secrets.
 * Placeholders __MYSQL_*__ are replaced during deploy.
 */
return [
  'db' => [
    'host' => '__MYSQL_HOST__',
    'name' => '__MYSQL_DATABASE__',
    'user' => '__MYSQL_USER__',
    'pass' => '__MYSQL_PASSWORD__',
    'charset' => 'utf8mb4',
  ],
  'admin_key' => '__MYSQL_ADMIN_KEY__',
  'upload_dir' => __DIR__ . '/../uploads/cms',
  'upload_url_base' => '/uploads/cms',
  'allowed_origins' => [
    'https://bashayer-logistics.com',
    'https://www.bashayer-logistics.com',
    'http://localhost:5173',
    'http://192.168.0.110:5173',
  ],
];
