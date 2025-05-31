<?php
// backend/app/services/AuthService.php
namespace App\Services;

use App\Models\User;
use App\Core\Request;

class AuthService {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function generateToken(int $length = 32): string {
        return bin2hex(random_bytes($length));
    }

    public function login(string $phoneNumber, string $password): ?array {
        $user = $this->userModel->verifyPassword($phoneNumber, $password);
        if ($user) {
            $token = $this->generateToken();
            // Token expires in, e.g., 7 days
            $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));
            if ($this->userModel->updateAuthToken($user['id'], $token, $expiresAt)) {
                return ['user_id' => $user['id'], 'phone_number' => $user['phone_number'], 'points' => $user['points'], 'auth_token' => $token];
            }
        }
        return null;
    }

    public function logout(string $token): bool {
        $user = $this->userModel->findByAuthToken($token);
        if ($user) {
            return $this->userModel->clearAuthToken($user['id']);
        }
        return false;
    }

    public function getAuthenticatedUser(): ?array {
        $token = Request::getAuthToken();
        if ($token) {
            return $this->userModel->findByAuthToken($token);
        }
        return null;
    }
}
?>
