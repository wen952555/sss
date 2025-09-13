<?php
header("Content-Type: application/json; charset=UTF-8");

$action = $_REQUEST['action'] ?? '';

// Sanitize the action name to prevent directory traversal attacks.
$action = preg_replace('/[^a-z0-9_]/', '', $action);

$actionFile = __DIR__ . '/actions/' . $action . '.php';

// More detailed debugging
error_log("Full request: " . print_r($_REQUEST, true));
$action = preg_replace('/[^a-z0-9_]/', '', $action);
error_log("Sanitized action: " . $action);
$actionFile = __DIR__ . '/actions/' . $action . '.php';
error_log("Checking for file: " . $actionFile);

if (file_exists($actionFile)) {
    error_log("File found. Including: " . $actionFile);
    require_once $actionFile;
} else {
    error_log("File not found: " . $actionFile);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Unknown API action provided.']);
}
?>
