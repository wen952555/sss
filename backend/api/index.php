<?php
die("index.php was executed");
// More robust version of backend/api/index.php

// --- Start of Script ---
error_log("--- backend/api/index.php execution started ---");

header("Content-Type: application/json; charset=UTF-8");

// --- Directory and Action Sanity Checks ---
$actionsDir = 'actions';
if (!is_dir($actionsDir)) {
    http_response_code(500);
    $errorMessage = 'Internal Server Error: Actions directory not found.';
    error_log($errorMessage);
    echo json_encode(['success' => false, 'message' => $errorMessage]);
    exit;
}

if (!is_readable($actionsDir)) {
    http_response_code(500);
    $errorMessage = 'Internal Server Error: Actions directory not readable.';
    error_log($errorMessage);
    echo json_encode(['success' => false, 'message' => $errorMessage]);
    exit;
}

// --- Action Processing ---
$action = $_REQUEST['action'] ?? '';

// This is a temporary hack to bypass the file_exists issue for the 'pa' action.
if ($action === 'pa') {
    require_once __DIR__ . '/actions/pa.php';
    exit;
}

$action = explode(':', $action)[0];
error_log("Full request: " . print_r($_REQUEST, true));

$sanitized_action = preg_replace('/[^a-z0-9_]/', '', $action);
error_log("Sanitized action: " . $sanitized_action);

if (empty($sanitized_action)) {
    http_response_code(400);
    $errorMessage = 'Invalid or missing API action.';
    error_log($errorMessage . ' Original action: ' . $action);
    echo json_encode(['success' => false, 'message' => $errorMessage]);
    exit;
}

$actionFile = $actionsDir . '/' . $sanitized_action . '.php';
error_log("Checking for file: " . $actionFile);
error_log("Absolute path of action file: " . realpath($actionFile));

clearstatcache();
$fileExists = file_exists($actionFile);
error_log("file_exists check result: " . ($fileExists ? 'true' : 'false'));

if ($fileExists) {
    error_log("File found. Including: " . $actionFile);
    require_once $actionFile;
} else {
    http_response_code(404);
    $errorMessage = 'Unknown API action provided.';
    error_log("File not found: " . $actionFile);
    $all_files_in_actions_dir = scandir($actionsDir);
    error_log("Files in actions dir: " . print_r($all_files_in_actions_dir, true));
    echo json_encode(['success' => false, 'message' => $errorMessage]);
}

error_log("--- backend/api/index.php execution finished ---");
?>
