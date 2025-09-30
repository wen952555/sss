<?php
// backend/api/tg_webhook.php

require_once 'config.php'; // Provides configuration constants

// --- Security & Configuration ---
// These variables are loaded from config.php
$BOT_TOKEN = $TELEGRAM_BOT_TOKEN ?? null;
$ADMIN_USER_ID = $TELEGRAM_ADMIN_ID ?? null;

// --- Webhook Processing ---
$update = json_decode(file_get_contents("php://input"), true);

if (!$update) {
    exit();
}

// A simple logging function for debugging
function log_message($message) {
    file_put_contents(__DIR__ . '/tg_webhook.log', date('Y-m-d H:i:s') . ' - ' . $message . "\n", FILE_APPEND);
}

log_message("Received update: " . json_encode($update));

if (isset($update['message']['text'])) {
    $message = $update['message'];
    $chat_id = $message['chat']['id'];
    $user_id = $message['from']['id'];
    $text = $message['text'];

    // --- Admin-Only Security Check ---
    if ($user_id != $ADMIN_USER_ID) {
        log_message("Ignoring message from non-admin user: {$user_id}");
        exit();
    }

    // --- Command Routing ---
    if (strpos($text, '/') === 0) {
        $parts = explode(' ', $text, 2);
        $command = $parts[0];
        $argument = $parts[1] ?? '';

        log_message("Admin command '{$command}' received with argument '{$argument}'");

        switch ($command) {
            case '/setgeminikey':
                handle_set_gemini_key($chat_id, $argument);
                break;
            default:
                sendMessage($chat_id, "Unknown command: {$command}");
                break;
        }
    }
}

/**
 * Handles the logic for the /setgeminikey command by writing to a dedicated file.
 * @param int $chat_id The chat ID to send the response to.
 * @param string $api_key The new Gemini API key.
 */
function handle_set_gemini_key($chat_id, $api_key) {
    if (empty($api_key)) {
        sendMessage($chat_id, "Invalid command. Usage: /setgeminikey YOUR_NEW_API_KEY");
        return;
    }

    $key_file_path = __DIR__ . '/gemini_api_key.txt';

    if (!is_writable(dirname($key_file_path))) {
        $error_message = "The directory containing the key file is not writable. Please check permissions.";
        log_message($error_message);
        sendMessage($chat_id, $error_message);
        return;
    }

    if (file_put_contents($key_file_path, $api_key) !== false) {
        sendMessage($chat_id, "Successfully updated Gemini API key.");
    } else {
        sendMessage($chat_id, "Failed to write to the API key file.");
    }
}

/**
 * Sends a message back to the specified Telegram chat.
 * @param int $chat_id The ID of the chat to send the message to.
 * @param string $text The message text to send.
 */
function sendMessage($chat_id, $text) {
    global $BOT_TOKEN;
    if (empty($BOT_TOKEN) || $BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
        log_message("Cannot send message: TELEGRAM_BOT_TOKEN is not set.");
        return;
    }

    $url = "https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage";
    $post_fields = ['chat_id' => $chat_id, 'text' => $text];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_fields));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    curl_close($ch);

    log_message("Sent message response: " . $result);
}

http_response_code(200);
echo json_encode(["status" => "ok"]);
?>