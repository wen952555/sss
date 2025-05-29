<?php
// Set CORS Headers (If not fully handled by .htaccess or for more dynamic control)
// This is crucial for your frontend to communicate with the backend.
$allowed_origin = "https://xxx.9525.ip-ddns.com"; // Your specific frontend domain

// You could also check $_SERVER['HTTP_ORIGIN'] against a whitelist if needed
// if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
//     header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
// } else {
//     // Optionally, deny the request or log it if the origin is not allowed
//     // For simplicity here, we'll just set the specific one.
//     header("Access-Control-Allow-Origin: " . $allowed_origin);
// }
header("Access-Control-Allow-Origin: " . $allowed_origin); // Set it directly

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control");
header("Access-Control-Allow-Credentials: true"); // Important for sessions/cookies cross-domain

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Autoload and common includes
// Note: __DIR__ will be backend/api/ so adjust paths to includes/
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/utils.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/game_logic.php';
// require_once __DIR__ . '/../../vendor/autoload.php'; // If composer vendor is one level above backend/

// Basic Routing
$request_method = $_SERVER['REQUEST_METHOD'];
// path_info comes from the ?path= part set by .htaccess
$path_info = $_GET['path'] ?? '';
$path_parts = explode('/', trim($path_info, '/'));
$resource = $path_parts[0] ?? null;
$action_or_id = $path_parts[1] ?? null;
$sub_action = $path_parts[2] ?? null;

$request_body = get_request_body();

// User Authentication Routes
if ($resource === 'auth') {
    // ... (auth routes remain the same as previous version)
    if ($action_or_id === 'register' && $request_method === 'POST') {
        register_user($request_body);
    } elseif ($action_or_id === 'login' && $request_method === 'POST') {
        login_user($request_body);
    } elseif ($action_or_id === 'logout' && $request_method === 'POST') {
        if (session_status() == PHP_SESSION_NONE) { session_start(['cookie_samesite' => 'None', 'cookie_secure' => true, 'cookie_httponly' => true]); }
        session_destroy();
        send_json_response(['message' => 'Logged out successfully.']);
    } elseif ($action_or_id === 'status' && $request_method === 'GET') {
        $userId = get_current_user_id(); // Ensure session_start is called within this
        if ($userId) {
             if (session_status() == PHP_SESSION_NONE) { session_start(['cookie_samesite' => 'None', 'cookie_secure' => true, 'cookie_httponly' => true]); } // Redundant if get_current_user_id starts it
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
    // ... (room routes remain the same)
    $currentUserId = require_auth();
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
            send_json_response($result, 400);
        } else {
            send_json_response($result, 200);
        }
    }
    else {
        send_json_response(['error' => 'Room endpoint not found.'], 404);
    }
}
// Game Routes
elseif ($resource === 'game') {
    // ... (game routes remain the same)
    $currentUserId = require_auth();
    $gameOrRoomId = (int)$action_or_id; // This can be roomId for 'start', or gameId for others

    if ($request_method === 'POST' && $sub_action === 'start') {
        $roomId = $gameOrRoomId;
        $result = start_game($roomId, $currentUserId);
         if (isset($result['error'])) {
            send_json_response($result, 400);
        } else {
            send_json_response($result, 200);
        }
    } elseif ($request_method === 'GET' && $sub_action === 'hand') {
        $gameId = $gameOrRoomId;
        $result = get_player_hand($gameId, $currentUserId);
        if (isset($result['error'])) {
            send_json_response($result, 404);
        } else {
            send_json_response($result);
        }
    } elseif ($request_method === 'POST' && $sub_action === 'arrange') {
        $gameId = $gameOrRoomId;
        $arrangement = $request_body['arrangement'] ?? null;
        if (!$arrangement) send_json_response(['error' => 'Arrangement data missing'], 400);
        $result = submit_player_arrangement($gameId, $currentUserId, $arrangement);
        if (isset($result['error'])) {
            send_json_response($result, 400);
        } else {
            send_json_response($result);
        }
    } elseif ($request_method === 'GET' && $sub_action === 'state') {
         $gameId = $gameOrRoomId;
         $result = get_game_state($gameId, $currentUserId);
         if (isset($result['error'])) {
            send_json_response($result, 404);
        } else {
            send_json_response($result);
        }
    }
    else {
        send_json_response(['error' => 'Game endpoint not found or method not allowed for game resource.'], 404);
    }
}
// Default fallback
else {
    send_json_response(['error' => "API endpoint '{$path_info}' not found."], 404);
}
?>
