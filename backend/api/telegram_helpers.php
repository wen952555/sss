<?php
// backend/api/telegram_helpers.php

/**
 * Sends a message to a given chat ID using the Telegram Bot API.
 *
 * @param int|string $chat_id The chat ID to send the message to.
 * @param string $text The message text.
 * @param string $token The Telegram Bot Token.
 * @return bool|string The response from the Telegram API, or false on failure.
 */
function sendMessage($chat_id, $text, $token, $keyboard = null) {
    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $post_fields = [
        'chat_id' => $chat_id,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];

    if ($keyboard) {
        $post_fields['reply_markup'] = json_encode([
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
            'one_time_keyboard' => false
        ]);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_fields));
    $output = curl_exec($ch);
    curl_close($ch);
    return $output;
}
?>
