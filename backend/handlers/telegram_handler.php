<?php
// handlers/telegram_handler.php

function handleTelegramMessage($pdo, $config, $message) {
    $chat_id = $message['chat']['id'];
    $text = $message['text'] ?? '';
    $parts = explode(' ', $text);
    $command = $parts[0];

    // The /start command is a public command to check if the bot is alive.
    if ($command === '/start') {
        sendMessage($config['token'], $chat_id, "Hello! The bot is running.");
        return;
    }

    // All other commands are admin-only.
    // We check for authorization from this point onwards.
    if ($chat_id != $config['admin_chat_id']) {
        sendMessage($config['token'], $chat_id, "You are not authorized to use this command.");
        return;
    }

    switch ($command) {
        case '/delete_user':
            $userId4d = $parts[1] ?? '';
            if ($userId4d) {
                $stmt = $pdo->prepare("DELETE FROM users WHERE user_id_4d = ?");
                $stmt->execute([$userId4d]);
                if ($stmt->rowCount() > 0) {
                    sendMessage($config['token'], $chat_id, "User {$userId4d} deleted successfully.");
                } else {
                    sendMessage($config['token'], $chat_id, "User {$userId4d} not found.");
                }
            }
            break;

        case '/set_points':
            $userId4d = $parts[1] ?? '';
            $points = $parts[2] ?? '';
            if ($userId4d && is_numeric($points)) {
                 $stmt = $pdo->prepare("UPDATE users SET points = ? WHERE user_id_4d = ?");
                 $stmt->execute([(int)$points, $userId4d]);
                 if ($stmt->rowCount() > 0) {
                    sendMessage($config['token'], $chat_id, "User {$userId4d}'s points set to {$points}.");
                } else {
                    sendMessage($config['token'], $chat_id, "User {$userId4d} not found.");
                }
            } else {
                sendMessage($config['token'], $chat_id, "Usage: /set_points <user_id_4d> <amount>");
            }
            break;

        default:
            sendMessage($config['token'], $chat_id, "Unknown command.");
            break;
    }
}

function sendMessage($token, $chat_id, $text) {
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $params = [
        'chat_id' => $chat_id,
        'text' => $text,
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);

    if(curl_errno($ch)){
        error_log('Curl error: ' . curl_error($ch));
    }

    curl_close($ch);

    // Optional: log Telegram's response for more insight
    if ($response) {
        $decoded_response = json_decode($response, true);
        if (!$decoded_response['ok']) {
            error_log('Telegram API Error: ' . $decoded_response['description']);
        }
    }
}
