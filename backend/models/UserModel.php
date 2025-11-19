<?php

class UserModel {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Generate a unique user ID
    private function generateUniqueUserId($length = 8) {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        do {
            $randomString = '';
            for ($i = 0; $i < $length; $i++) {
                $randomString .= $characters[rand(0, $charactersLength - 1)];
            }
        } while ($this->findById($randomString)); // Check for uniqueness
        return $randomString;
    }

    public function create($phone, $password) {
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        $user_id = $this->generateUniqueUserId();

        $query = "INSERT INTO " . $this->table_name . " (phone, user_id, password_hash) VALUES (:phone, :user_id, :password_hash)";
        
        $stmt = $this->conn->prepare($query);

        // Sanitize
        $phone = htmlspecialchars(strip_tags($phone));
        
        // Bind
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':password_hash', $password_hash);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    public function findByPhone($phone) {
        $query = "SELECT id, user_id, password_hash, balance FROM " . $this->table_name . " WHERE phone = :phone LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findById($id) {
        $query = "SELECT id, user_id, balance FROM " . $this->table_name . " WHERE id = :id OR user_id = :id LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
