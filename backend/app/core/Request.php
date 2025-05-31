<?php
// backend/app/core/Request.php
namespace App\Core;

class Request {
    public static function get(string $key, $default = null) {
        return $_GET[$key] ?? $default;
    }

    public static function post(string $key, $default = null) {
        return $_POST[$key] ?? $default;
    }

    public static function input(string $key, $default = null) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() === JSON_ERROR_NONE && isset($data[$key])) {
            return $data[$key];
        }
        return $_REQUEST[$key] ?? $default;
    }

    public static function all() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return array_merge($_REQUEST, $data ?? []);
        }
        return $_REQUEST;
    }

    public static function getMethod() {
        return strtoupper($_SERVER['REQUEST_METHOD']);
    }

    public static function getAuthToken() {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
                return $matches[1];
            }
        }
        return self::input('auth_token'); // Fallback for non-header auth
    }
}
?>
