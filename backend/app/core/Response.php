<?php
// backend/app/core/Response.php
namespace App\Core;

class Response {
    public static function json($data, int $status = 200, array $headers = []) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        // CORS Headers - Adjust your frontend domain
        // ⭐ Replace with your ACTUAL Cloudflare Pages frontend domain
        $allowed_origin = "https://xxx.9525.ip-ddns.com";

        if (isset($_SERVER['HTTP_ORIGIN'])) {
            // Allow only your frontend domain. For development, you might add localhost.
            // Example: $allowed_origins = ["https://xxx.9525.ip-ddns.com", "http://localhost:8080"];
            // if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
            //    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
            // }
            if ($_SERVER['HTTP_ORIGIN'] == $allowed_origin) {
                 header("Access-Control-Allow-Origin: {$allowed_origin}");
            } else {
                // For security, only allow your specific origin in production.
                // If you need to test from other origins (like a local dev server), add them.
                // For now, being strict.
                // header("Access-Control-Allow-Origin: {$allowed_origin}"); // Or deny if not matching
            }
        } else {
             // If HTTP_ORIGIN is not set (e.g. same-origin or server-to-server), this is fine.
             // Or, if you strictly want to enforce it being set by browsers:
             // self::json(['error' => 'Origin not allowed or not specified'], 403);
             // return;
        }
        
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true"); // If you plan to use cookies/sessions with credentials

        foreach ($headers as $key => $value) {
            header("$key: $value");
        }

        echo json_encode($data);
        exit;
    }

    public static function handleOptionsRequest() {
        if (strtoupper($_SERVER['REQUEST_METHOD']) == 'OPTIONS') {
            self::json([], 204); // No Content for OPTIONS
        }
    }
}
?>
