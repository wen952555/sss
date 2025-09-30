-- SQL Schema for the Application

--
-- Table structure for table `users`
-- This table is essential for user authentication and points management.
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` decimal(10,2) NOT NULL DEFAULT '1000.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `incoming_emails`
-- This table stores raw emails received from the Cloudflare Worker for AI processing.
--
DROP TABLE IF EXISTS `incoming_emails`;
CREATE TABLE `incoming_emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `parsed_bet_slips`
-- This table stores the structured results from the Bet Parser AI.
--
DROP TABLE IF EXISTS `parsed_bet_slips`;
CREATE TABLE `parsed_bet_slips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email_id` int(11) DEFAULT NULL,
  `region` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bet_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bet_content` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parsed_numbers` text COLLATE utf8mb4_unicode_ci,
  `amount_per_bet` decimal(10,2) DEFAULT NULL,
  `source_text` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_id` (`email_id`),
  CONSTRAINT `parsed_bet_slips_ibfk_1` FOREIGN KEY (`email_id`) REFERENCES `incoming_emails` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;