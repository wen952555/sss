<?php
session_start();
require 'db.php';
require 'utils.php';

if (!isset($_SESSION['user_id'])) sendJSON(["error" => "未登录"], 401);

$stmt = $pdo->prepare("SELECT short_id, phone, points FROM users WHERE short_id = ?");
$stmt->execute([$_SESSION['user_id']]);
sendJSON($stmt->fetch(PDO::FETCH_ASSOC));