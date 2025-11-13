<?php
class Auth {
    public static function generateToken($user_id) {
        $payload = [
            'user_id' => $user_id,
            'exp' => time() + (24 * 60 * 60) // 24小时过期
        ];
        
        // 简单的token生成，实际应该使用JWT等更安全的方式
        return base64_encode(json_encode($payload));
    }
    
    public static function validateToken($token) {
        try {
            $decoded = json_decode(base64_decode($token), true);
            if (!$decoded || !isset($decoded['user_id']) || !isset($decoded['exp'])) {
                return false;
            }
            
            if ($decoded['exp'] < time()) {
                return false;
            }
            
            return $decoded['user_id'];
        } catch (Exception $e) {
            return false;
        }
    }
    
    public static function getUserIdFromHeader() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return false;
        }
        
        $auth_header = $headers['Authorization'];
        if (strpos($auth_header, 'Bearer ') !== 0) {
            return false;
        }
        
        $token = substr($auth_header, 7);
        return self::validateToken($token);
    }
}
?>