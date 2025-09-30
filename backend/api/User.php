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
        $data = json_decode(file_get_contents("php://input"), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            $this->send_error("用户名和密码不能为空。");
        }
        if (strlen($password) < 6) {
            $this->send_error("密码长度不能少于6位。");
        }

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            $this->send_error("用户名已存在。");
        }

        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        if ($stmt->execute([$username, $password_hash])) {
            $this->send_response(["message" => "注册成功。"]);
        } else {
            $this->send_error("注册失败，请稍后再试。");
        }
    }

    private function login() {
        $data = json_decode(file_get_contents("php://input"), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            $this->send_error("用户名和密码不能为空。");
        }

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // session_start() is already called in index.php
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $this->send_response(["message" => "登录成功。", "user" => ['username' => $user['username'], 'points' => $user['points']]]);
        } else {
            $this->send_error("用户名或密码错误。");
        }
    }

    private function getPoints() {
        if (!isset($_SESSION['user_id'])) {
            $this->send_error("用户未登录。", 401);
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
        if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
             $stmt = $this->pdo->prepare("SELECT points FROM users WHERE id = ?");
             $stmt->execute([$_SESSION['user_id']]);
             $user = $stmt->fetch();
             $this->send_response(["isLoggedIn" => true, "user" => ['username' => $_SESSION['username'], 'points' => $user['points']]]);
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
