CREATE TABLE `pre_sorted_hands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hand_id` int(11) NOT NULL,
  `arrangement_index` tinyint(4) NOT NULL,
  `sorted_hand` text NOT NULL,
  `score` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `hand_id` (`hand_id`),
  CONSTRAINT `pre_sorted_hands_ibfk_1` FOREIGN KEY (`hand_id`) REFERENCES `pre_dealt_hands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
