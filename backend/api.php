<?php
header("Access-Control-Allow-Origin: *");
require_once 'db.php';

$action = $_GET['action'] ?? '';
$module = explode('.', $_GET['module'] ?? 'game')[0];

switch($module) {
    case 'auth': require 'auth.php'; break;
    case 'game': require 'game.php'; break;
    case 'transfer': require 'transfer.php'; break;
    default: http_response_code(404);
}
