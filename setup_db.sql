CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 1000,
  `last_active` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `game_rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_type` varchar(50) NOT NULL,
  `game_mode` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'waiting',
  `player_count` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `room_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_ready` tinyint(1) NOT NULL DEFAULT '0',
  `is_auto_managed` tinyint(1) NOT NULL DEFAULT '0',
  `initial_hand` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_id_user_id` (`room_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert some test users
INSERT INTO `users` (`id`, `phone`, `password`, `points`) VALUES
(1, 'user1', 'password', 1000),
(2, 'user2', 'password', 1000),
(3, 'user3', 'password', 1000),
(4, 'user4', 'password', 1000),
(5, 'user5', 'password', 1000);
