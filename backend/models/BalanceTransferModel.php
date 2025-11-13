<?php
class BalanceTransferModel {
    private $conn;
    private $table_name = "balance_transfers";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 创建转账记录
    public function createTransfer($from_user_id, $to_user_id, $amount, $note = '') {
        if (!$this->conn) return false;

        $query = "INSERT INTO " . $this->table_name . " (from_user_id, to_user_id, amount, note) VALUES (:from_user_id, :to_user_id, :amount, :note)";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':from_user_id', $from_user_id);
            $stmt->bindParam(':to_user_id', $to_user_id);
            $stmt->bindParam(':amount', $amount);
            $stmt->bindParam(':note', $note);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in createTransfer: " . $e->getMessage());
            return false;
        }
    }

    // 获取用户的转账记录
    public function getUserTransfers($user_id, $limit = 20) {
        if (!$this->conn) return [];

        $query = "SELECT * FROM " . $this->table_name . " WHERE from_user_id = :user_id OR to_user_id = :user_id ORDER BY created_at DESC LIMIT :limit";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in getUserTransfers: " . $e->getMessage());
            return [];
        }
    }

    // 获取最近的转账记录
    public function getRecentTransfers($user_id, $count = 5) {
        if (!$this->conn) return [];
        
        $query = "SELECT u.username, t.amount FROM " . $this->table_name . " t JOIN users u ON t.to_user_id = u.id WHERE t.from_user_id = :user_id ORDER BY t.created_at DESC LIMIT :count";

        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':count', $count, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in getRecentTransfers: " . $e->getMessage());
            return [];
        }
    }
}
?>