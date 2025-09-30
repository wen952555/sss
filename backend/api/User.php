<?php
// backend/api/User.php

class User {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function execute() {
        $action = $_GET['action'] ?? '';
        switch ($action) {
            case 'register':
                $this->register();
                break;
            case 'login':
                $this->login();
                break;
            case 'getPoints':
                $this->getPoints();
                break;
            case 'checkAuth':
                $this->checkAuth();
                break;
            case 'logout':
                $this->logout();
                break;
            default:
                $this->send_error("Invalid user action.");
        }
    }

    private function register() {
        if (!$this->pdo) {
            $this->send_error("Database connection not available.");
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $odds_multiplier = $data['odds_multiplier'] ?? '45.00';

        if (empty($email) || empty($password)) {
            $this->send_error("邮箱和密码不能为空。");
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->send_error("无效的邮箱格式。");
        }
        if (strlen($password) < 6) {
            $this->send_error("密码长度不能少于6位。");
        }
        if (!in_array($odds_multiplier, ['45.00', '45'])) {
             $this->send_error("无效的赔率选择。");
        }

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $this->send_error("该邮箱已被注册。");
        }

        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->pdo->prepare("INSERT INTO users (email, password_hash, odds_multiplier) VALUES (?, ?, ?)");
        if ($stmt->execute([$email, $password_hash, $odds_multiplier])) {
            $this->send_response(["message" => "注册成功。"]);
        } else {
            $this->send_error("注册失败，请稍后再试。");
        }
    }

    private function login() {
        if (!$this->pdo) {
            $this->send_error("Database connection not available.");
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            $this->send_error("邮箱和密码不能为空。");
        }

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // session_start() is already called in index.php
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['email'] = $user['email'];
            $this->send_response(["message" => "登录成功。", "user" => ['email' => $user['email'], 'points' => $user['points'], 'odds_multiplier' => $user['odds_multiplier']]]);
        } else {
            $this->send_error("邮箱或密码错误。");
        }
    }

    private function getPoints() {
        if (!isset($_SESSION['user_id'])) {
            $this->send_error("用户未登录。", 401);
        }
        if (!$this->pdo) {
            $this->send_error("Database connection not available.");
        }

        $stmt = $this->pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if ($user) {
            $this->send_response(["points" => $user['points']]);
        } else {
            $this->send_error("用户不存在。", 404);
        }
    }

    private function checkAuth() {
        if (isset($_SESSION['user_id']) && isset($_SESSION['email'])) {
            if (!$this->pdo) {
                // If there's a session but no DB, log them in but show an error state for DB-dependent actions.
                $this->send_response(["isLoggedIn" => true, "user" => ['email' => $_SESSION['email'], 'points' => 'N/A', 'odds_multiplier' => 'N/A'], "db_error" => "Database connection not available."]);
                return;
            }
             $stmt = $this->pdo->prepare("SELECT points, odds_multiplier FROM users WHERE id = ?");
             $stmt->execute([$_SESSION['user_id']]);
             $user = $stmt->fetch();
             $this->send_response(["isLoggedIn" => true, "user" => ['email' => $_SESSION['email'], 'points' => $user['points'], 'odds_multiplier' => $user['odds_multiplier']]]);
        } else {
            $this->send_response(["isLoggedIn" => false]);
        }
    }

    private function logout() {
        // Unset all of the session variables.
        $_SESSION = array();
        // If it's desired to kill the session, also delete the session cookie.
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        $this->send_response(["message" => "登出成功。"]);
    }

    private function send_response($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(array_merge(["success" => true], $data));
        exit();
    }

    private function send_error($message, $code = 400) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(["success" => false, "message" => $message]);
        exit();
    }
}
