<?php
require_once __DIR__ . '/../lib/telegram.php';

$update = json_decode(file_get_contents('php://input'), true);

if ($update) {
    $bot = new TelegramBot();
    $bot->processUpdate($update);
}
?>