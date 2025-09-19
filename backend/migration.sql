-- This script updates the database schema to support multi-round games.
-- Please back up your database before running this script.

-- Add 'current_round' column to 'game_rooms' table
-- This command may fail if the column already exists. This is expected.
ALTER TABLE game_rooms ADD COLUMN current_round INT(11) NOT NULL DEFAULT 0;

-- Add 'total_rounds' column to 'game_rooms' table
-- This command may fail if the column already exists. This is expected.
ALTER TABLE game_rooms ADD COLUMN total_rounds INT(11) NOT NULL DEFAULT 1;

-- Create 'game_rounds' table
CREATE TABLE IF NOT EXISTS `game_rounds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `round_number` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `hand` text,
  PRIMARY KEY (`id`),
  KEY `room_round_user_idx` (`room_id`,`round_number`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
