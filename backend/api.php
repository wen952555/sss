<?php
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db.php';

// 前端通过 api.php?module=auth&action=register 访问
$module = $_GET['module'] ?? '';
$action = $_GET['action'] ?? '';

if ($module === 'auth') {
    include 'auth.php';
} elseif ($module === 'game') {
    include 'game.php';
} elseif ($module === 'transfer') {
    include 'transfer.php';
} else {
    echo json_encode(['msg' => 'Backend API is running', 'status' => 'OK']);
}