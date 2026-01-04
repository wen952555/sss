
/* backend/db.sql */
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) NOT NULL,
  `short_id` char(4) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` decimal(15,2) DEFAULT '1000.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `short_id` (`short_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pre_deals` (
  `room_id` int NOT NULL,
  `round_id` int NOT NULL,
  `t1` text, `t2` text, `t3` text, `t4` text,
  PRIMARY KEY (`room_id`,`round_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `round_id` int NOT NULL,
  `track_id` int NOT NULL,
  `head` varchar(50), `mid` varchar(100), `tail` varchar(100),
  `is_settled` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_round` (`user_id`,`room_id`,`round_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
