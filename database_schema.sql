--
-- Database: `wcn_game`
--

-- --------------------------------------------------------

--
-- Table structure for table `game_rooms`
--

CREATE TABLE `game_rooms` (
  `id` int(11) NOT NULL,
  `game_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'waiting',
  `player_count` int(11) NOT NULL,
  `room_code` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `room_players`
--

CREATE TABLE `room_players` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_ready` tinyint(1) NOT NULL DEFAULT '0',
  `is_auto_managed` tinyint(1) NOT NULL DEFAULT '0',
  `initial_hand` text,
  `score` int(11) NOT NULL DEFAULT '0',
  `submitted_hand` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` int(11) NOT NULL DEFAULT '1000',
  `last_active` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `pre_dealt_hands`
--

CREATE TABLE `pre_dealt_hands` (
  `id` int(11) NOT NULL,
  `player_count` int(11) NOT NULL,
  `hands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`hands`)),
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `game_hand_comparisons`
--

CREATE TABLE `game_hand_comparisons` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `player1_id` int(11) NOT NULL,
  `player2_id` int(11) NOT NULL,
  `lane` enum('top','middle','bottom') NOT NULL,
  `result` enum('win','loss','draw') NOT NULL,
  `score_change` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `game_rooms`
--
ALTER TABLE `game_rooms`
  ADD PRIMARY KEY (`id`);

--
--
-- Indexes for table `room_players`
--
ALTER TABLE `room_players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_id_user_id` (`room_id`,`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- Indexes for table `pre_dealt_hands`
--
ALTER TABLE `pre_dealt_hands`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `game_hand_comparisons`
--
ALTER TABLE `game_hand_comparisons`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `game_rooms`
--
ALTER TABLE `game_rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
--
-- AUTO_INCREMENT for table `room_players`
--
ALTER TABLE `room_players`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pre_dealt_hands`
--
ALTER TABLE `pre_dealt_hands`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `game_hand_comparisons`
--
ALTER TABLE `game_hand_comparisons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
