<?php
class UserModel {
    private $conn;
    private $table_name = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    // 生成4位数字+字母的用户ID
    private function generateUserID() {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $user_id = '';
        for ($i = 0; $i < 4; $i++) {
            $user_id .= $characters[rand(0, strlen($characters) - 1)];
        }
        return $user_id;
    }

    // 检查用户ID是否唯一
    private function isUserIDUnique($user_id) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result['count'] == 0;
    }

    // 创建用户（手机号注册）
    public function createUser($phone, $password, $email = '') {
        // 生成唯一用户ID
        $user_id = $this->generateUserID();
        while (!$this->isUserIDUnique($user_id)) {
            $user_id = $this->generateUserID();
        }

        $query = "INSERT INTO " . $this->table_name . " 
                  (phone, user_id, password_hash, email) 
                  VALUES (:phone, :user_id, :password, :email)";
        
        $stmt = $this->conn->prepare($query);
        
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':password', $password_hash);
        $stmt->bindParam(':email', $email);
        
        return $stmt->execute() ? $user_id : false;
    }

    // 根据手机号查找用户
    public function getUserByPhone($phone) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE phone = :phone";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 根据用户ID查找用户
    public function getUserByUserId($user_id) {
        $query = "SELECT id, phone, user_id, email, balance, level, created_at 
                  FROM " . $this->table_name . " 
                  WHERE user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 根据ID查找用户
    public function getUserById($id) {
        $query = "SELECT id, phone, user_id, email, balance, level, created_at 
                  FROM " . $this->table_name . " 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        return $stmt->fetch();
    }

    // 更新用户余额
    public function updateBalance($user_id, $new_balance) {
        $query = "UPDATE " . $this->table_name . " 
                  SET balance = :balance 
                  WHERE id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':balance', $new_balance);
        $stmt->bindParam(':user_id', $user_id);
        
        return $stmt->execute();
    }

    // 检查手机号是否已存在
    public function phoneExists($phone) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE phone = :phone";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }

    // 更新最后登录时间
    public function updateLastLogin($user_id) {
        $query = "UPDATE " . $this->table_name . " 
                  SET last_login = CURRENT_TIMESTAMP 
                  WHERE id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        return $stmt->execute();
    }
}
?>