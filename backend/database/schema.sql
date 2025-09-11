-- SQL schema for creating the debug_logs table.
-- This table is used for server-side logging to help diagnose issues in production.

CREATE TABLE IF NOT EXISTS `debug_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `log_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `log_level` VARCHAR(10),
  `message` TEXT
);
