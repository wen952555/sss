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
        if (!$this->conn) return false;
        
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE user_id = :user_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return $result['count'] == 0;
        } catch (PDOException $e) {
            error_log("Database error in isUserIDUnique: " . $e->getMessage());
            return false;
        }
    }

    // 创建用户（手机号注册）
    public function createUser($phone, $password, $email = '') {
        if (!$this->conn) {
            throw new Exception('数据库连接失败');
        }

        // 生成唯一用户ID
        $user_id = $this->generateUserID();
        $attempts = 0;
        while (!$this->isUserIDUnique($user_id) && $attempts < 10) {
            $user_id = $this->generateUserID();
            $attempts++;
        }
        
        if ($attempts >= 10) {
            throw new Exception('无法生成唯一用户ID');
        }

        $query = "INSERT INTO " . $this->table_name . " 
                  (phone, user_id, password_hash, email, balance, level) 
                  VALUES (:phone, :user_id, :password, :email, 1000, 1)";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':password', $password_hash);
            $stmt->bindParam(':email', $email);
            
            if ($stmt->execute()) {
                return $user_id;
            } else {
                throw new Exception('执行SQL语句失败');
            }
        } catch (PDOException $e) {
            error_log("Database error in createUser: " . $e->getMessage());
            
            // 检查是否是重复手机号错误
            if (strpos($e->getMessage(), 'Duplicate entry') !== false && strpos($e->getMessage(), 'phone') !== false) {
                throw new Exception('手机号已注册');
            }
            
            throw new Exception('数据库错误: ' . $e->getMessage());
        }
    }

    // 根据手机号查找用户
    public function getUserByPhone($phone) {
        if (!$this->conn) return null;
        
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE phone = :phone";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':phone', $phone);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getUserByPhone: " . $e->getMessage());
            return null;
        }
    }

    // 根据用户ID查找用户
    public function getUserByUserId($user_id) {
        if (!$this->conn) return null;
        
        $query = "SELECT id, phone, user_id, email, balance, level, created_at 
                  FROM " . $this->table_name . " 
                  WHERE user_id = :user_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getUserByUserId: " . $e->getMessage());
            return null;
        }
    }

    // 根据ID查找用户
    public function getUserById($id) {
        if (!$this->conn) return null;
        
        $query = "SELECT id, phone, user_id, email, balance, level, created_at 
                  FROM " . $this->table_name . " 
                  WHERE id = :id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Database error in getUserById: " . $e->getMessage());
            return null;
        }
    }

    // 更新用户余额
    public function updateBalance($user_id, $new_balance) {
        if (!$this->conn) return false;
        
        $query = "UPDATE " . $this->table_name . " 
                  SET balance = :balance 
                  WHERE id = :user_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':balance', $new_balance);
            $stmt->bindParam(':user_id', $user_id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in updateBalance: " . $e->getMessage());
            return false;
        }
    }

    // 检查手机号是否已存在
    public function phoneExists($phone) {
        if (!$this->conn) return false;
        
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name . " 
                  WHERE phone = :phone";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':phone', $phone);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return $result['count'] > 0;
        } catch (PDOException $e) {
            error_log("Database error in phoneExists: " . $e->getMessage());
            return false;
        }
    }

    // 更新最后登录时间
    public function updateLastLogin($user_id) {
        if (!$this->conn) return false;
        
        $query = "UPDATE " . $this->table_name . " 
                  SET last_login = CURRENT_TIMESTAMP 
                  WHERE id = :user_id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Database error in updateLastLogin: " . $e->getMessage());
            return false;
        }
    }
}
?>