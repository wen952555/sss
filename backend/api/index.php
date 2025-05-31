<?php
// backend/api/index.php

// Autoloader - Simple PSR-4 style autoloader
spl_autoload_register(function ($class) {
    // project-specific namespace prefix
    $prefix = 'App\\';
    // base directory for the namespace prefix
    $base_dir = __DIR__ . '/../app/'; // Adjust if your 'app' folder is elsewhere

    // does the class use the namespace prefix?
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        // no, move to the next registered autoloader
        return;
    }

    // get the relative class name
    $relative_class = substr($class, $len);

    // replace the namespace prefix with the base directory, replace namespace
    // separators with directory separators in the relative class name, append
    // with .php
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    // if the file exists, require it
    if (file_exists($file)) {
        require $file;
    }
});

use App\Core\Request;
use App\Core\Response;
use App\Controllers\UserController;
use App\Controllers\GameController; // We'll create this
use App\Controllers\AdminController; // We'll create this

// Handle pre-flight OPTIONS requests for CORS
Response::handleOptionsRequest();

// Basic Routing
// The 'route' parameter will come from .htaccess or direct query string
// e.g., api/index.php?route=user/register or from .htaccess rewrite of /api/user/register
$route = Request::get('route', '');
$method = Request::getMethod();

// Initialize controllers
$userController = new UserController();
$gameController = new GameController(); // Placeholder for now
$adminController = new AdminController(); // Placeholder for now

// --- Public Routes (No Auth Required) ---
if ($method === 'POST' && $route === 'user/register') {
    $userController->register();
} elseif ($method === 'POST' && $route === 'user/login') {
    $userController->login();
}
// --- Authenticated Routes ---
// All routes below this typically require authentication
else {
    $authService = new \App\Services\AuthService(); // Need to instantiate it here or pass it around
    $currentUser = $authService->getAuthenticatedUser();

    if (!$currentUser && !in_array($route, ['telegram/webhook'])) { // Allow telegram webhook without game auth token
        // For admin actions that might be called by telegram bot, they might have their own auth.
        // Let's make an exception for admin routes for now, they will have their own key/IP check.
        $isAdminRoute = strpos($route, 'admin/') === 0;
        if (!$isAdminRoute) {
            Response::json(['error' => 'Authentication required.'], 401);
            exit;
        }
    }

    // User specific authenticated routes
    if ($currentUser) {
        if ($method === 'POST' && $route === 'user/logout') {
            $userController->logout();
        } elseif ($method === 'GET' && $route === 'user/info') {
            $userController->getUserInfo();
        } elseif ($method === 'POST' && $route === 'user/gift_points') {
            $userController->giftPoints();
        }
        // Game related routes
        elseif ($method === 'POST' && $route === 'game/find_match') {
            $gameController->findMatch($currentUser);
        } elseif ($method === 'GET' && $route === 'game/room_status') { // e.g., game/room_status?room_id=XYZ
            $gameController->getRoomStatus(Request::get('room_id'), $currentUser);
        } elseif ($method === 'POST' && $route === 'game/submit_hand') {
            $gameController->submitHand($currentUser);
        } elseif ($method === 'POST' && $route === 'game/toggle_托管') { // Toggle AI auto-play
            $gameController->toggle托管($currentUser, Request::input('room_id'));
        }
        // ... other authenticated game routes
    }


    // Admin routes (e.g., called by Telegram bot)
    // These might have a separate API key or IP check for security
    if ($method === 'POST' && $route === 'admin/user/update_points') {
         $adminController->updateUserPoints(); // This method will need its own auth (e.g. API key)
    }

    // Telegram Bot Webhook (specific route, no user auth token needed, uses Telegram secret)
    elseif ($method === 'POST' && $route === 'telegram/webhook') {
        // This will be handled by the telegram_bot/bot_webhook.php script directly for simplicity,
        // or you can route it to a controller method here.
        // For now, assume telegram_bot/bot_webhook.php is the direct endpoint for Telegram.
        // If routed here:
        // $telegramBotController = new TelegramBotController();
        // $telegramBotController->handleWebhook();
        // For now, let this fall through or be handled by a separate script for the bot.
        // Response::json(['error' => 'Telegram webhook endpoint defined but not fully handled here. Use direct script.'], 501);
    }

    // Fallback for unhandled authenticated routes or if no currentUser for auth-required actions
    elseif ($route !== '' && !($method === 'POST' && $route === 'telegram/webhook')) { // Avoid erroring on webhook if it wasn't caught above
        // Check if it was an admin route that failed its internal auth
        $isAdminRoute = strpos($route, 'admin/') === 0;
        if ($isAdminRoute && !$currentUser) { // If admin route and no current user (which is game user context)
             // Let admin controller handle auth internally or error if not handled
        } else if (!$currentUser && !$isAdminRoute && $route !== '') { // If not admin, not public, and no user
            Response::json(['error' => 'Endpoint not found or authentication failed.'], 404);
        } else if ($route !== '') { // If route specified but not matched
            Response::json(['error' => "Endpoint '{$route}' not found."], 404);
        }
        // If route is empty, it means base /api/ call, could return API info or error
        // else if (empty($route)) {
        //    Response::json(['message' => 'API Root. Specify an endpoint.'], 200);
        // }
    }
}

// If no route was matched at all (e.g. /api/ with no specific action)
// This part is tricky because Response::json exits.
// A better router would collect the controller/method and execute it after all route definitions.
// For this simple router, if a Response::json() was called, script execution already stopped.
// If execution reaches here, it means no route matched and no response was sent.
// This condition might not be hit if using `exit` in Response::json.
// To ensure a response for /api/ or unhandled:
if (empty($route) && !headers_sent()) {
     Response::json(['message' => 'Welcome to the Thirteen Water API. Please specify an action.'], 200);
} elseif (!headers_sent()) {
    // This will catch cases where a route was specified but not matched by any condition above
    // and no $currentUser was found for auth routes, but it wasn't an explicit auth failure.
    // However, the logic above should handle most 404s for specific routes.
    // Response::json(['error' => "API action '{$route}' not found or method not allowed."], 404);
}

?>
