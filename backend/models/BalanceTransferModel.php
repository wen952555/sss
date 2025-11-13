<?php
class BalanceTransferModel {
    private $conn;
    private $table_name = "balance_transfers";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 创建转账记录
    public function createTransfer($from_user_id, $to_user_id, $amount, $note = '') {
        $query = "INSERT INTO " . $this->table_name . " 
                  (from_user_id, to_user_id, amount, note) 
                  VALUES (:from_user_id, :to_user_id, :amount, :note)";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':from_user_id', $from_user_id);
        $stmt->bindParam(':to_user_id', $to_user_id);
        $stmt->bindParam(':amount', $amount);
        $stmt->bindParam(':note', $note);
        
        return $stmt->execute();
    }

    // 获取用户的转账记录
    public function getUserTransfers($user_id, $limit = 20) {
        $query = "SELECT 
                    bt.*,
                    from_user.user_id as from_user_id_display,
                    from_user.phone as from_phone,
                    to_user.user_id as to_user_id_display, 
                    to_user.phone as to_phone
                  FROM " . $this->table_name . " bt
                  JOIN users from_user ON bt.from_user_id = from_user.id
                  JOIN users to_user ON bt.to_user_id = to_user.id
                  WHERE bt.from_user_id = :user_id OR bt.to_user_id = :user_id
                  ORDER BY bt.created_at DESC 
                  LIMIT :limit";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    // 获取用户最近的转账记录
    public function getRecentTransfers($user_id, $count = 5) {
        $query = "SELECT 
                    bt.*,
                    CASE 
                        WHEN bt.from_user_id = :user_id THEN 'sent'
                        ELSE 'received'
                    END as transfer_type,
                    CASE 
                        WHEN bt.from_user_id = :user_id THEN to_user.user_id
                        ELSE from_user.user_id
                    END as counterparty_id,
                    CASE 
                        WHEN bt.from_user_id = :user_id THEN to_user.phone
                        ELSE from_user.phone
                    END as counterparty_phone
                  FROM " . $this->table_name . " bt
                  JOIN users from_user ON bt.from_user_id = from_user.id
                  JOIN users to_user ON bt.to_user_id = to_user.id
                  WHERE bt.from_user_id = :user_id OR bt.to_user_id = :user_id
                  ORDER BY bt.created_at DESC 
                  LIMIT :count";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':count', $count, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
}
?>