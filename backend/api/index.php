<?php
header("Content-Type: application/json; charset=UTF-8");

$action = $_REQUEST['action'] ?? '';

// Sanitize the action name to prevent directory traversal attacks.
$action = preg_replace('/[^a-z0-9_]/', '', $action);

$actionFile = __DIR__ . '/actions/' . $action . '.php';

if (file_exists($actionFile)) {
    require_once $actionFile;
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Unknown API action provided.']);
}
?>
