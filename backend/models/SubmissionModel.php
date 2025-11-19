<?php

class SubmissionModel {
    private $conn;
    private $table_name = "player_submissions";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($game_id, $user_id, $arrangement) {
        $query = "INSERT INTO " . $this->table_name . " (game_id, user_id, arranged_cards) VALUES (:game_id, :user_id, :arranged_cards)";
        $stmt = $this->conn->prepare($query);
        
        $arranged_cards_json = json_encode($arrangement);
        
        $stmt->bindParam(':game_id', $game_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':arranged_cards', $arranged_cards_json);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function findByGame($game_id) {
        $query = "SELECT s.user_id, u.user_id as username, s.arranged_cards FROM " . $this->table_name . " s JOIN users u ON s.user_id = u.id WHERE s.game_id = :game_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // This is a simplified scoring logic for demonstration
    public function calculateScores($game_id, $comparator) {
        $submissions = $this->findByGame($game_id);
        if (count($submissions) < 4) { // Assuming a 4-player game
            return null; // Not all players have submitted
        }

        // For simplicity, we'll just compare player 1 against everyone else.
        // A real implementation would compare all players against each other.
        $player1_submission = json_decode($submissions[0]['arranged_cards'], true);
        $total_score = 0;

        for ($i = 1; $i < count($submissions); $i++) {
            $opponent_submission = json_decode($submissions[$i]['arranged_cards'], true);
            
            // Compare head, middle, tail
            $score = 0;
            $score += $comparator->compareHands($player1_submission['head'], $opponent_submission['head']);
            $score += $comparator->compareHands($player1_submission['middle'], $opponent_submission['middle']);
            $score += $comparator->compareHands($player1_submission['tail'], $opponent_submission['tail']);

            $total_score += $score;
        }

        // Update player 1's score in the database
        $query = "UPDATE " . $this->table_name . " SET total_score = :total_score WHERE game_id = :game_id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':total_score', $total_score);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->bindParam(':user_id', $submissions[0]['user_id']);
        $stmt->execute();

        return ['scores' => 'calculated']; // Simplified response
    }
}
