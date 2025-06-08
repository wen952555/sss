<?php
class Auth {
    private $db;
    private $secretKey = "your_secret_key_here";
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function validateToken($token) {
        if (!$token) return false;
        
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) return false;
            
            list($header, $payload, $signature) = $parts;
            $validSignature = hash_hmac('sha256', "$header.$payload", $this->secretKey, true);
            $validSignatureBase64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
            
            return hash_equals($signature, $validSignatureBase64);
        } catch (Exception $e) {
            return false;
        }
    }
    
    public function getUserIdFromToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        
        $payload = json_decode(base64_decode($parts[1]), true);
        return $payload['userId'] ?? null;
    }
    
    // 其他认证方法...
}
?>
