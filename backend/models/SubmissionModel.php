<?php
class SubmissionModel {
    private $conn;
    private $table_name = "player_submissions";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 创建提交记录
    public function createSubmission($game_id, $user_id, $arranged_cards, $total_score = 0) {
        if (!$this->conn) return false;
        
        $query = "INSERT INTO " . $this->table_name . " 
                  (game_id, user_id, arranged_cards, total_score) 
                  VALUES (:game_id, :user_id, :arranged_cards, :total_score)";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $arranged_json = json_encode($arranged_cards);
            
            $stmt->bindParam(':game_id', $game_id);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':arranged_cards', $arranged_json);
            $stmt->bindParam(':total_score', $total_score);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in createSubmission: " . $e->getMessage());
            return false;
        }
    }

    // 检查用户是否已提交过该牌局
    public function hasSubmitted($game_id, $user_id) {
        if (!$this->conn) return false;
        
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE game_id = :game_id AND user_id = :user_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':game_id', $game_id);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return ($result['count'] ?? 0) > 0;
        } catch (PDOException $e) {
            error_log("Database error in hasSubmitted: " . $e->getMessage());
            return false;
        }
    }
}
?>