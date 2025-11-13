<?php
class SubmissionModel {
    private $conn;
    private $table_name = "player_submissions";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 创建提交记录
    public function createSubmission($game_id, $user_id, $arranged_cards, $total_score = 0) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (game_id, user_id, arranged_cards, total_score) 
                  VALUES (:game_id, :user_id, :arranged_cards, :total_score)";
        
        $stmt = $this->conn->prepare($query);
        
        $arranged_json = json_encode($arranged_cards);
        
        $stmt->bindParam(':game_id', $game_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':arranged_cards', $arranged_json);
        $stmt->bindParam(':total_score', $total_score);
        
        return $stmt->execute();
    }

    // 获取用户的提交记录
    public function getUserSubmissions($user_id, $limit = 10) {
        $query = "SELECT ps.*, pgg.session_type, pgg.session_id, pgg.round_number 
                  FROM " . $this->table_name . " ps
                  JOIN pre_generated_games pgg ON ps.game_id = pgg.id
                  WHERE ps.user_id = :user_id 
                  ORDER BY ps.created_at DESC 
                  LIMIT :limit";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    // 检查用户是否已提交过该牌局
    public function hasSubmitted($game_id, $user_id) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE game_id = :game_id AND user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }
}
?>