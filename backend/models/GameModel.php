<?php
class GameModel {
    private $conn;
    private $table_name = "pre_generated_games";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 获取可用牌局
    public function getAvailableGame($session_type) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE session_type = :session_type AND status = 'available' 
                  ORDER BY session_id, round_number LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_type', $session_type);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 标记牌局为已使用
    public function markGameAsUsed($game_id) {
        $query = "UPDATE " . $this->table_name . " 
                  SET status = 'used' 
                  WHERE id = :game_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':game_id', $game_id);
        return $stmt->execute();
    }

    // 获取特定牌局
    public function getGameById($game_id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :game_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 插入新牌局
    public function createGame($data) {
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
        
        $stmt = $this->conn->prepare($query);
        
        return $stmt->execute($data);
    }

    // 统计可用牌局数量
    public function countAvailableGames($session_type) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE session_type = :session_type AND status = 'available'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_type', $session_type);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result['count'];
    }

    // 获取下一个session_id和round_number
    public function getNextGamePosition($session_type) {
        $query = "SELECT MAX(session_id) as max_session, 
                         MAX(round_number) as max_round 
                  FROM " . $this->table_name . " 
                  WHERE session_type = :session_type";
        
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
    }
}
?>