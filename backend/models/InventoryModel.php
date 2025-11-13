<?php
class InventoryModel {
    private $conn;
    private $table_name = "inventory_monitor";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 更新库存统计
    public function updateInventory($session_type, $total_games, $available_games) {
        if (!$this->conn) return false;
        
        $query = "INSERT INTO " . $this->table_name . " 
                  (session_type, total_games, available_games, last_replenish) 
                  VALUES (:session_type, :total_games, :available_games, CURRENT_TIMESTAMP)
                  ON DUPLICATE KEY UPDATE 
                  total_games = :total_games_update, 
                  available_games = :available_games_update,
                  last_replenish = CURRENT_TIMESTAMP";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->bindParam(':total_games', $total_games);
            $stmt->bindParam(':available_games', $available_games);
            $stmt->bindParam(':total_games_update', $total_games);
            $stmt->bindParam(':available_games_update', $available_games);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in updateInventory: " . $e->getMessage());
            return false;
        }
    }

    // 获取库存状态
    public function getInventoryStatus($session_type) {
        if (!$this->conn) return null;
        
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE session_type = :session_type";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':session_type', $session_type);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getInventoryStatus: " . $e->getMessage());
            return null;
        }
    }

    // 获取所有库存状态
    public function getAllInventoryStatus() {
        if (!$this->conn) return [];
        
        $query = "SELECT * FROM " . $this->table_name;
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Database error in getAllInventoryStatus: " . $e->getMessage());
            return [];
        }
    }
}
?>