-- SQL Schema for the Betting Game

--
-- Table structure for table `players`
--
DROP TABLE IF EXISTS `players`;
CREATE TABLE `players` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(10,2) NOT NULL DEFAULT '1000.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Seeding data for table `players`
--
INSERT INTO `players` (`id`, `score`) VALUES
('user123', '1000.00');

--
-- Table structure for table `game_rounds`
--
DROP TABLE IF EXISTS `game_rounds`;
CREATE TABLE `game_rounds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `winning_numbers` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `bets`
--
DROP TABLE IF EXISTS `bets`;
CREATE TABLE `bets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bet_numbers` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `game_round_id` int(11) DEFAULT NULL,
  `winnings` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `game_round_id` (`game_round_id`),
  CONSTRAINT `bets_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `bets_ibfk_2` FOREIGN KEY (`game_round_id`) REFERENCES `game_rounds` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Seeding data for table `bets`
--
-- Example of an open bet for user123
INSERT INTO `bets` (`player_id`, `bet_numbers`, `amount`, `status`) VALUES
('user123', '[1, 8, 15, 22, 29, 36, 43]', '10.00', 'open');

-- Example of another open bet for user123
INSERT INTO `bets` (`player_id`, `bet_numbers`, `amount`, `status`) VALUES
('user123', '[7, 14, 21, 28, 35, 42, 49]', '5.00', 'open');

-- Note: The database user will need privileges to create and modify these tables.
-- The application code in `config.php` should be updated with actual database credentials.
