<?php
/* backend/index.php */
header("Content-Type: application/json");
require_once 'lib/DB.php';
require_once 'lib/CardLogic.php';

$path = explode('?', $_SERVER['REQUEST_URI'])[0];
$method = $_SERVER['REQUEST_METHOD'];

// 简单的路由分发
if ($path == '/api/register') include 'api/auth.php';
if ($path == '/api/game/fetch') include 'api/game.php';
if ($path == '/api/bot') include 'api/bot.php';
// ...其他路由...