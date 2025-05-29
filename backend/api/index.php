<?php
// Set CORS Headers (Alternative to .htaccess, more control)
// Replace with your Cloudflare Pages domain in production
$allowed_origin = "http://localhost:5173"; // For Vite dev server
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // You might want to check against a list of allowed origins
    // For now, if it's a dev environment or specific CF Pages domain
    if (strpos($_SERVER['HTTP_ORIGIN'], 'pages.dev') !== false || strpos($_SERVER['HTTP_ORIGIN'], 'localhost') !== false) {
         $allowed_origin = $_SERVER['HTTP_ORIGIN'];
    }
}

header("Access-Control-Allow-Origin: " . $allowed_origin);
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control");
header("Access-Control-Allow-Credentials: true"); // Important for sessions/cookies

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Autoload and common includes
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/utils.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/game_logic.php';
// require_once __DIR__ . '/../vendor/autoload.php'; // If using Composer

// Basic Routing
$request_method = $_SERVER['REQUEST_METHOD'];
// The path is expected to be like "auth/login", "game/create" from .htaccess or web server config
$path_info = $_GET['path'] ?? '';
$path_parts = explode('/', trim($path_info, '/'));
$resource = $path_parts[0] ?? null;
$action_or_id = $path_parts[1] ?? null;
$sub_action = $path_parts[2] ?? null;

$request_body = get_request_body(); // For POST, PUT data

// User Authentication Routes
if ($resource === 'auth') {
    if ($action_or_id === 'register' && $request_method === 'POST') {
        register_user($request_body);
    } elseif ($action_or_id === 'login' && $request_method === 'POST') {
        login_user($request_body);
    } elseif ($action_or_id === 'logout' && $request_method === 'POST') {
        // require_auth(); // Optional: ensure user is logged in to log out
        if (session_status() == PHP_SESSION_NONE) { session_start(); }
        session_destroy();
        send_json_response(['message' => 'Logged out successfully.']);
    } elseif ($action_or_id === 'status' && $request_method === 'GET') {
        $userId = get_current_user_id();
        if ($userId) {
            send_json_response(['loggedIn' => true, 'userId' => $userId, 'username' => $_SESSION['username'] ?? null]);
        } else {
            send_json_response(['loggedIn' => false]);
        }
    }
    else {
        send_json_response(['error' => 'Auth endpoint not found.'], 404);
    }
}
// Room Routes
elseif ($resource === 'rooms') {
    $currentUserId = require_auth(); // All room actions require login
    if ($request_method === 'POST' && $action_or_id === 'create') {
        $room = create_new_game_room($currentUserId);
        if ($room && !isset($room['error'])) {
            send_json_response($room, 201);
        } else {
            send_json_response($room ?: ['error' => 'Failed to create room.'], 500);
        }
    } elseif ($request_method === 'POST' && $action_or_id === 'join') {
        $roomCode = $request_body['roomCode'] ?? '';
        if (empty($roomCode)) send_json_response(['error' => 'Room code required.'], 400);

        $result = join_game_room($currentUserId, strtoupper($roomCode));
        if (isset($result['error'])) {
            send_json_response($result, 400); // Or other appropriate codes
        } else {
            send_json_response($result, 200);
        }
    }
    // TODO: GET /rooms - list available rooms
    else {
        send_json_response(['error' => 'Room endpoint not found.'], 404);
    }
}
// Game Routes
elseif ($resource === 'game') {
    $currentUserId = require_auth(); // All game actions require login
    $gameId = (int)$action_or_id; // e.g. /game/123/...

    if ($request_method === 'POST' && $sub_action === 'start') { // POST /game/{roomId}/start (roomId is passed as action_or_id for now)
        $roomId = (int)$action_or_id; // Here action_or_id is roomId
        $result = start_game($roomId, $currentUserId);
         if (isset($result['error'])) {
            send_json_response($result, 400);
        } else {
            send_json_response($result, 200);
        }
    } elseif ($request_method === 'GET' && $sub_action === 'hand') { // GET /game/{gameId}/hand
        $result = get_player_hand($gameId, $currentUserId);
        if (isset($result['error'])) {
            send_json_response($result, 404);
        } else {
            send_json_response($result);
        }
    } elseif ($request_method === 'POST' && $sub_action === 'arrange') { // POST /game/{gameId}/arrange
        $arrangement = $request_body['arrangement'] ?? null;
        if (!$arrangement) send_json_response(['error' => 'Arrangement data missing'], 400);
        $result = submit_player_arrangement($gameId, $currentUserId, $arrangement);
        if (isset($result['error'])) {
            send_json_response($result, 400);
        } else {
            send_json_response($result);
        }
    } elseif ($request_method === 'GET' && $sub_action === 'state') { // GET /game/{gameId}/state
         $result = get_game_state($gameId, $currentUserId);
         if (isset($result['error'])) {
            send_json_response($result, 404);
        } else {
            send_json_response($result);
        }
    }
    // TODO: Other game actions like compare, next round, etc.
    else {
        send_json_response(['error' => 'Game endpoint not found or method not allowed for game resource.'], 404);
    }
}
// Default fallback
else {
    send_json_response(['error' => 'API endpoint not found.'], 404);
}
?>
