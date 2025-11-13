<?php
class GameModel {
    private $conn;
    private $table_name = "pre_generated_games";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 获取可用牌局
    public function getAvailableGame($session_type) {
        if (!$this->conn) return null;
        
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE session_type = :session_type AND status = 'available' 
                  ORDER BY session_id, round_number LIMIT 1";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getAvailableGame: " . $e->getMessage());
            return null;
        }
    }

    // 标记牌局为已使用
    public function markGameAsUsed($game_id) {
        if (!$this->conn) return false;
        
        $query = "UPDATE " . $this->table_name . " 
                  SET status = 'used' 
                  WHERE id = :game_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':game_id', $game_id);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in markGameAsUsed: " . $e->getMessage());
            return false;
        }
    }

    // 统计可用牌局数量
    public function countAvailableGames($session_type) {
        if (!$this->conn) return 0;
        
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE session_type = :session_type AND status = 'available'";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return $result['count'] ?? 0;
        } catch (PDOException $e) {
            error_log("Database error in countAvailableGames: " . $e->getMessage());
            return 0;
        }
    }
}
?>