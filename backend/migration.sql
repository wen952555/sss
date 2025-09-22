-- Complete database schema and test user data
-- This script is intended to be run to set up the database from scratch.

--
-- Database: `wcn_game`
--

-- --------------------------------------------------------

--
-- Table structure for table `game_rooms`
--

CREATE TABLE IF NOT EXISTS `game_rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'waiting',
  `player_count` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `room_players`
--

CREATE TABLE IF NOT EXISTS `room_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_ready` tinyint(1) NOT NULL DEFAULT '0',
  `is_auto_managed` tinyint(1) NOT NULL DEFAULT '0',
  `initial_hand` text,
  `score` int(11) NOT NULL DEFAULT '0',
  `submitted_hand` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_id_user_id` (`room_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` int(11) NOT NULL DEFAULT '1000',
  `last_active` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `pre_dealt_hands`
--

CREATE TABLE IF NOT EXISTS `pre_dealt_hands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_count` int(11) NOT NULL,
  `hands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`hands`)),
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `game_hand_comparisons`
--

CREATE TABLE IF NOT EXISTS `game_hand_comparisons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `lane` enum('top','middle','bottom') NOT NULL,
  `result` enum('win','loss','draw') NOT NULL,
  `score_change` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--
-- Insert test users
-- Note: Passwords should be hashed in a real environment.
--

INSERT INTO `users` (phone, password, points) VALUES
('user1', 'password', 1000),
('user2', 'password', 1000),
('user3', 'password', 1000),
('user4', 'password', 1000),
('user5', 'password', 1000)
ON DUPLICATE KEY UPDATE password = VALUES(password);
