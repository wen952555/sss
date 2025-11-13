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

    // 获取特定牌局
    public function getGameById($game_id) {
        if (!$this->conn) return null;
        
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :game_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':game_id', $game_id);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getGameById: " . $e->getMessage());
            return null;
        }
    }

    // 插入新牌局
    public function createGame($data) {
        if (!$this->conn) return false;
        
        $query = "INSERT INTO " . $this->table_name . " 
                  (session_type, session_id, round_number, 
                   player1_original, player1_arranged,
                   player2_original, player2_arranged,
                   player3_original, player3_arranged,
                   player4_original, player4_arranged) 
                  VALUES 
                  (:session_type, :session_id, :round_number,
                   :player1_original, :player1_arranged,
                   :player2_original, :player2_arranged,
                   :player3_original, :player3_arranged,
                   :player4_original, :player4_arranged)";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            return $stmt->execute($data);
        } catch (PDOException $e) {
            error_log("Database error in createGame: " . $e->getMessage());
            return false;
        }
    }

    // 统计可用牌局数量
    public function countAvailableGames($session_type, $status = 'available') {
        if (!$this->conn) return 0;
        
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE session_type = :session_type AND status = :status";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->bindParam(':status', $status);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return $result['count'] ?? 0;
        } catch (PDOException $e) {
            error_log("Database error in countAvailableGames: " . $e->getMessage());
            return 0;
        }
    }

    // 获取下一个session_id和round_number
    public function getNextGamePosition($session_type) {
        if (!$this->conn) return ['session_id' => 1, 'round_number' => 1];
        
        $query = "SELECT MAX(session_id) as max_session, 
                         MAX(round_number) as max_round 
                  FROM " . $this->table_name . " 
                  WHERE session_type = :session_type";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->execute();
            
            $result = $stmt->fetch();
            
            $next_session = $result['max_session'] ? $result['max_session'] : 0;
            $next_round = $result['max_round'] ? $result['max_round'] + 1 : 1;
            
            // 如果round超过20，递增session
            if ($next_round > 20) {
                $next_session++;
                $next_round = 1;
            }
            
            return ['session_id' => $next_session, 'round_number' => $next_round];
        } catch (PDOException $e) {
            error_log("Database error in getNextGamePosition: " . $e->getMessage());
            return ['session_id' => 1, 'round_number' => 1];
        }
    }
}
?>