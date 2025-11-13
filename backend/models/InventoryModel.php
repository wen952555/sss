<?php
class InventoryModel {
    private $conn;
    private $table_name = "inventory_monitor";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 更新库存统计
    public function updateInventory($session_type, $total_games, $available_games) {
        $query = "INSERT INTO " . $this->table_name . " 
                  (session_type, total_games, available_games, last_replenish) 
                  VALUES (:session_type, :total_games, :available_games, CURRENT_TIMESTAMP)
                  ON DUPLICATE KEY UPDATE 
                  total_games = :total_games, 
                  available_games = :available_games,
                  last_replenish = CURRENT_TIMESTAMP";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_type', $session_type);
        $stmt->bindParam(':total_games', $total_games);
        $stmt->bindParam(':available_games', $available_games);
        
        return $stmt->execute();
    }

    // 获取库存状态
    public function getInventoryStatus($session_type) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE session_type = :session_type";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':session_type', $session_type);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 获取所有库存状态
    public function getAllInventoryStatus() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
}
?>