-- Bashayer Logistics — Hostinger MySQL schema (shared hosting)
-- Import in hPanel → phpMyAdmin → SQL, OR: mysql -u USER -p DB < schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL DEFAULT '',
  name_ar VARCHAR(255) NOT NULL DEFAULT '',
  model_en VARCHAR(255) NOT NULL DEFAULT '',
  model_ar VARCHAR(255) NOT NULL DEFAULT '',
  image_url VARCHAR(1024) NOT NULL DEFAULT '',
  passengers INT NOT NULL DEFAULT 4,
  vip TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  forms_json JSON NULL,
  data_json JSON NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_vehicles_active_sort (active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  route_id VARCHAR(128) NOT NULL DEFAULT '',
  vehicle_key VARCHAR(64) NOT NULL DEFAULT '',
  fleet_service_id VARCHAR(64) NOT NULL DEFAULT '',
  trip_type VARCHAR(64) NOT NULL DEFAULT '',
  booking_form_id VARCHAR(64) NOT NULL DEFAULT '',
  name_en VARCHAR(512) NOT NULL DEFAULT '',
  name_ar VARCHAR(512) NOT NULL DEFAULT '',
  image_url VARCHAR(1024) NOT NULL DEFAULT '',
  price DECIMAL(12,2) NULL,
  original_price DECIMAL(12,2) NULL,
  pickup_price DECIMAL(12,2) NULL,
  dropoff_price DECIMAL(12,2) NULL,
  hourly_rate DECIMAL(12,2) NULL,
  hours INT NULL,
  passengers INT NULL,
  hide_price TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  data_json JSON NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_packages_active (active),
  KEY idx_packages_vehicle (vehicle_key),
  KEY idx_packages_service (fleet_service_id),
  KEY idx_packages_route (route_id),
  KEY idx_packages_trip (trip_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_rows (
  collection VARCHAR(64) NOT NULL,
  id VARCHAR(128) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (collection, id),
  KEY idx_content_active (collection, active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_revision (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO content_revision (id, revision) VALUES (1, 1)
  ON DUPLICATE KEY UPDATE revision = revision;

SET FOREIGN_KEY_CHECKS = 1;
