<?php
require_once __DIR__ . '/db.php';

class Auth {
    private $conn;
    private $table = 'users';

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // 生成JWT令牌
    public function generateToken($user_id, $phone) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $user_id,
            'phone' => $phone,
            'iat' => time(),
            'exp' => time() + (JWT_EXPIRE_DAYS * 24 * 60 * 60)
        ]);
        
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    // 验证JWT令牌
    public function validateToken($token) {
        if (!$token) return false;
        
        $parts = explode('.', $token);
        if (count($parts) != 3) return false;
        
        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
        $base64UrlSignatureToVerify = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if ($base64UrlSignature !== $base64UrlSignatureToVerify) {
            return false;
        }
        
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlPayload)), true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        return $payload;
    }

    // 用户注册
    public function register($phone, $password) {
        // 检查手机号是否已注册
        $query = "SELECT id FROM " . $this->table . " WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            return false; // 手机号已存在
        }

        // 生成用户ID（4位数字和字母）
        $user_id = $this->generateUserId();
        // 密码哈希
        $hashed_password = password_hash($password, PASSWORD_BCRYPT);

        $query = "INSERT INTO " . $this->table . " (user_id, phone, password) VALUES (:user_id, :phone, :password)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':password', $hashed_password);

        if($stmt->execute()) {
            return $user_id;
        }
        return false;
    }

    // 生成4位用户ID（数字和字母）
    private function generateUserId() {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < 4; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        
        // 检查是否唯一
        $query = "SELECT id FROM " . $this->table . " WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $randomString);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            // 如果重复，递归生成
            return $this->generateUserId();
        }
        
        return $randomString;
    }

    // 用户登录
    public function login($phone, $password) {
        $query = "SELECT * FROM " . $this->table . " WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if(password_verify($password, $row['password'])) {
                // 生成token
                $token = $this->generateToken($row['user_id'], $row['phone']);
                
                // 返回用户信息（不包含密码）
                unset($row['password']);
                $row['token'] = $token;
                return $row;
            }
        }
        return false;
    }

    // 根据用户ID获取用户信息
    public function getUserById($user_id) {
        $query = "SELECT user_id, phone, points, created_at FROM " . $this->table . " WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    // 根据手机号搜索用户
    public function searchByPhone($phone) {
        $query = "SELECT user_id, phone, points, created_at FROM " . $this->table . " WHERE phone LIKE :phone LIMIT 10";
        $stmt = $this->conn->prepare($query);
        $phone = '%' . $phone . '%';
        $stmt->bindParam(':phone', $phone);
        $stmt->execute();

        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = $row;
        }
        return $users;
    }

    // 验证管理员权限
    public function isAdmin($user_id) {
        $query = "SELECT is_admin FROM " . $this->table . " WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row['is_admin'] == 1;
        }
        return false;
    }
}
?>