<?php
class Auth {
    private $db;
    private $secretKey = "your_secret_key_here";
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function register($phone, $password) {
        // 检查手机号是否已存在
        $existingUser = $this->db->query("SELECT id FROM users WHERE phone = ?", [$phone])->fetch();
        if ($existingUser) {
            return ['error' => 'Phone number already registered'];
        }
        
        // 创建用户
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $this->db->query("INSERT INTO users (phone, password) VALUES (?, ?)", [$phone, $hashedPassword]);
        
        return ['success' => true];
    }
    
    public function login($phone, $password) {
        $user = $this->db->query("SELECT id, password FROM users WHERE phone = ?", [$phone])->fetch();
        if (!$user || !password_verify($password, $user['password'])) {
            return ['error' => 'Invalid phone or password'];
        }
        
        $token = $this->generateToken($user['id']);
        return ['token' => $token, 'userId' => $user['id']];
    }
    
    public function generateToken($userId) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'userId' => $userId,
            'exp' => time() + (7 * 24 * 60 * 60) // 7天过期
        ]);
        
        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }
    
    public function validateToken($token) {
        if (!$token) return false;
        
        $parts = explode('.', $token);
        if (count($parts) != 3) return false;
        
        list($base64Header, $base64Payload, $base64Signature) = $parts;
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
        $calcSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        if ($calcSignature !== $base64Signature) {
            return false;
        }
        
        $payload = json_decode(base64_decode($base64Payload), true);
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        return true;
    }
    
    public function getUserIdFromToken($token) {
        $parts = explode('.', $token);
        if (count($parts) != 3) return null;
        
        $payload = json_decode(base64_decode($parts[1]), true);
        return $payload['userId'] ?? null;
    }
    
    public function transferPoints($senderId, $receiverPhone, $amount) {
        // 检查发送者是否有足够积分
        $sender = $this->db->query("SELECT points FROM users WHERE id = ?", [$senderId])->fetch();
        if (!$sender || $sender['points'] < $amount) {
            return ['error' => 'Insufficient points'];
        }
        
        // 获取接收者ID
        $receiver = $this->db->query("SELECT id FROM users WHERE phone = ?", [$receiverPhone])->fetch();
        if (!$receiver) {
            return ['error' => 'Receiver not found'];
        }
        
        // 执行转账
        $this->db->beginTransaction();
        try {
            $this->db->query("UPDATE users SET points = points - ? WHERE id = ?", [$amount, $senderId]);
            $this->db->query("UPDATE users SET points = points + ? WHERE id = ?", [$amount, $receiver['id']]);
            
            $this->db->query("INSERT INTO point_transactions (sender_id, receiver_id, amount) VALUES (?, ?, ?)", 
                [$senderId, $receiver['id'], $amount]);
            
            $this->db->commit();
            return ['success' => true];
        } catch (Exception $e) {
            $this->db->rollBack();
            return ['error' => 'Transfer failed'];
        }
    }
}
?>
