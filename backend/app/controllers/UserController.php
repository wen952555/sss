<?php
// backend/app/controllers/UserController.php
namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\User;
use App\Services\AuthService;
use App\Services\PointService; // We'll create this next

class UserController {
    private $userModel;
    private $authService;
    private $pointService;

    public function __construct() {
        $this->userModel = new User();
        $this->authService = new AuthService();
        $this->pointService = new PointService(); // Initialize PointService
    }

    public function register() {
        $phone = Request::input('phone_number');
        $password = Request::input('password');

        if (empty($phone) || empty($password)) {
            Response::json(['error' => 'Phone number and password are required.'], 400);
            return;
        }
        // Basic validation (you can add more complex rules)
        if (strlen($password) < 6) {
             Response::json(['error' => 'Password must be at least 6 characters long.'], 400);
            return;
        }
        if ($this->userModel->findByPhoneNumber($phone)) {
            Response::json(['error' => 'Phone number already registered.'], 409); // 409 Conflict
            return;
        }

        $userId = $this->userModel->create($phone, $password);
        if ($userId) {
            Response::json(['message' => 'User registered successfully.', 'user_id' => $userId], 201);
        } else {
            Response::json(['error' => 'Failed to register user.'], 500);
        }
    }

    public function login() {
        $phone = Request::input('phone_number');
        $password = Request::input('password');

        if (empty($phone) || empty($password)) {
            Response::json(['error' => 'Phone number and password are required.'], 400);
            return;
        }

        $authData = $this->authService->login($phone, $password);
        if ($authData) {
            Response::json($authData);
        } else {
            Response::json(['error' => 'Invalid phone number or password.'], 401);
        }
    }

    public function logout() {
        $currentUser = $this->authService->getAuthenticatedUser();
        if (!$currentUser) {
            Response::json(['error' => 'Not authenticated or invalid token.'], 401);
            return;
        }
        // To effectively logout, we need the token itself to clear it from DB
        $token = Request::getAuthToken();
        if ($this->authService->logout($token)) {
             Response::json(['message' => 'Logged out successfully.']);
        } else {
            Response::json(['error' => 'Logout failed.'], 500);
        }
    }

    public function getUserInfo() {
        $user = $this->authService->getAuthenticatedUser();
        if ($user) {
            Response::json($user);
        } else {
            Response::json(['error' => 'Not authenticated.'], 401);
        }
    }

    public function giftPoints() {
        $currentUser = $this->authService->getAuthenticatedUser();
        if (!$currentUser) {
            Response::json(['error' => 'Not authenticated.'], 401);
            return;
        }

        $toPhoneNumber = Request::input('to_phone_number');
        $amount = (int)Request::input('amount');

        if (empty($toPhoneNumber) || $amount <= 0) {
            Response::json(['error' => 'Recipient phone number and positive amount are required.'], 400);
            return;
        }

        if ($toPhoneNumber === $currentUser['phone_number']) {
            Response::json(['error' => 'Cannot gift points to yourself.'], 400);
            return;
        }
        
        $recipient = $this->userModel->findByPhoneNumber($toPhoneNumber);
        if (!$recipient) {
            Response::json(['error' => 'Recipient user not found.'], 404);
            return;
        }

        try {
            $this->pointService->transferPoints(
                $currentUser['id'],
                $recipient['id'],
                $amount,
                'gift'
            );
            $currentUserNewPoints = $this->userModel->getPoints($currentUser['id']);
            Response::json([
                'message' => "Successfully gifted {$amount} points to {$toPhoneNumber}.",
                'current_user_points' => $currentUserNewPoints
            ]);
        } catch (\Exception $e) {
            Response::json(['error' => $e->getMessage()], 400);
        }
    }
}
?>
