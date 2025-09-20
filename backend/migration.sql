-- Migration to remove round-based system
ALTER TABLE `game_rooms`
  DROP COLUMN `current_round`,
  DROP COLUMN `total_rounds`,
  DROP COLUMN `game_mode`;

DROP TABLE IF EXISTS `game_rounds`;
