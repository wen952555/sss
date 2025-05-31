<?php
// backend/app/models/User.php
namespace App\Models;

use App\Core\Database;
use PDO;

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create(string $phoneNumber, string $password): ?int {
        if (empty($phoneNumber) || empty($password)) {
            return null;
        }
        if ($this->findByPhoneNumber($phoneNumber)) {
            return null; // User already exists
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO users (phone_number, password_hash, points) VALUES (:phone, :pass, :points)");
        try {
            $stmt->execute(['phone' => $phoneNumber, 'pass' => $passwordHash, 'points' => 1000]); // Default 1000 points
            return (int)$this->db->lastInsertId();
        } catch (\PDOException $e) {
            error_log("User creation error: " . $e->getMessage());
            return null;
        }
    }

    public function findByPhoneNumber(string $phoneNumber) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE phone_number = :phone");
        $stmt->execute(['phone' => $phoneNumber]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT id, phone_number, points FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function verifyPassword(string $phoneNumber, string $password): ?array {
        $user = $this->findByPhoneNumber($phoneNumber);
        if ($user && password_verify($password, $user['password_hash'])) {
            unset($user['password_hash']); // Don't send hash to client
            return $user;
        }
        return null;
    }

    public function updateAuthToken(int $userId, string $token, string $expiresAt): bool {
        $stmt = $this->db->prepare("UPDATE users SET auth_token = :token, token_expires_at = :expires WHERE id = :id");
        return $stmt->execute(['token' => $token, 'expires' => $expiresAt, 'id' => $userId]);
    }

    public function findByAuthToken(string $token) {
        $stmt = $this->db->prepare("SELECT id, phone_number, points FROM users WHERE auth_token = :token AND token_expires_at > datetime('now')");
        $stmt->execute(['token' => $token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function clearAuthToken(int $userId): bool {
        $stmt = $this->db->prepare("UPDATE users SET auth_token = NULL, token_expires_at = NULL WHERE id = :id");
        return $stmt->execute(['id' => $userId]);
    }

    public function updatePoints(int $userId, int $newPoints): bool {
        $stmt = $this->db->prepare("UPDATE users SET points = :points WHERE id = :id");
        return $stmt->execute(['points' => $newPoints, 'id' => $userId]);
    }

    public function getPoints(int $userId): ?int {
        $stmt = $this->db->prepare("SELECT points FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? (int)$result['points'] : null;
    }
}
?>
