<?php
/**
 * Telegram Webhook for Player Score Management
 *
 * This script acts as a webhook for a Telegram bot to allow authorized administrators
 * to manage player scores in a database.
 *
 * --- SETUP INSTRUCTIONS ---
 * 1.  SET BOT TOKEN:
 *     - Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual Telegram Bot Token.
 *
 * 2.  SET ADMIN IDs:
 *     - Replace the example user ID in ADMIN_IDS with the Telegram User ID(s) of the administrator(s).
 *     - You can get a user's ID by talking to a bot like @userinfobot on Telegram.
 *
 * 3.  CONFIGURE DATABASE:
 *     - This script requires a `config.php` file in the same directory.
 *     - The `config.php` file must create a PDO database connection object named $pdo.
 *     - Example `config.php`:
 *       <?php
 *       $host = '127.0.0.1';
 *       $db   = 'your_database';
 *       $user = 'your_username';
 *       $pass = 'your_password';
 *       $charset = 'utf8mb4';
 *
 *       $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
 *       $options = [
 *           PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
 *           PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
 *           PDO::ATTR_EMULATE_PREPARES   => false,
 *       ];
 *       try {
 *            $pdo = new PDO($dsn, $user, $pass, $options);
 *       } catch (\PDOException $e) {
 *            throw new \PDOException($e->getMessage(), (int)$e->getCode());
 *       }
 *
 * 4.  DATABASE TABLE:
 *     - The script assumes you have a table named `players` with the following structure:
 *       CREATE TABLE players (
 *         id VARCHAR(255) NOT NULL PRIMARY KEY, -- Or INT, depending on your player ID format
 *         score INT NOT NULL DEFAULT 0,
 *         -- other player columns...
 *       );
 *
 * 5.  SET WEBHOOK:
 *     - You need to set this script as the webhook for your Telegram bot. You can do this by visiting the following URL in your browser:
 *       https://api.telegram.org/bot<YOUR_B_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/path/to/tg_webhook.php
 */

// Enable error reporting for debugging during development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- CONFIGURATION ---
// 1. Set your Telegram Bot Token here
define('BOT_TOKEN', 'YOUR_TELEGRAM_BOT_TOKEN');

// 2. Set the list of authorized administrator Telegram User IDs
define('ADMIN_IDS', [123456789]); // Example: [123456789, 987654321]

// --- HELPER FUNCTION TO SEND A MESSAGE VIA TELEGRAM API ---
function sendMessage($chat_id, $text) {
    $url = 'https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage';
    $post_fields = [
        'chat_id' => $chat_id,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_fields));
    $output = curl_exec($ch);
    curl_close($ch);
    return $output;
}

// --- WEBHOOK PROCESSING ---

// Get the JSON payload from the request
$content = file_get_contents("php://input");
$update = json_decode($content, true);

// Log the raw update for debugging
// file_put_contents('telegram_log.txt', $content . "\n", FILE_APPEND);

if (!$update) {
    // No update received
    exit();
}

// Check if the update is a message and has text
if (isset($update['message'])) {
    $message = $update['message'];
    $chat_id = $message['chat']['id'];
    $from_id = $message['from']['id'];
    $text = $message['text'];

    // --- ADMIN AUTHENTICATION ---
    if (!in_array($from_id, ADMIN_IDS)) {
        sendMessage($chat_id, "Sorry, you are not authorized to use this bot.");
        exit();
    }

    // --- COMMAND PARSING AND EXECUTION ---
    // Example: /add_score player123 100
    if (preg_match('/^\/(\w+)\s+(\S+)\s+(-?\d+)$/', $text, $matches)) {
        $command = $matches[1];
        $player_id = $matches[2];
        $points = (int)$matches[3];

        // --- Database Interaction ---
        try {
            // Include database configuration and establish connection ($pdo).
            require_once 'config.php';

            $stmt = null;
            if ($command === 'add_score') {
                $stmt = $pdo->prepare("UPDATE players SET score = score + ? WHERE id = ?");
            } elseif ($command === 'set_score') {
                $stmt = $pdo->prepare("UPDATE players SET score = ? WHERE id = ?");
            } else {
                sendMessage($chat_id, "Unknown command: $command");
                exit();
            }

            if ($stmt) {
                if ($command === 'add_score') {
                    $stmt->execute([$points, $player_id]);
                } else {
                    $stmt->execute([$points, $player_id]);
                }

                $affected_rows = $stmt->rowCount();

                if ($affected_rows > 0) {
                    $action_desc = ($command === 'add_score') ? "Added $points points to" : "Set score for";
                    sendMessage($chat_id, "✅ Success! $action_desc player '$player_id'.");
                } else {
                    sendMessage($chat_id, "⚠️ Warning: Player '$player_id' not found or score was not changed.");
                }
            }
        } catch (PDOException $e) {
            // Log the error to a file for the admin to see, not to the user.
            error_log("Database Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ An error occurred with the database. Please check the server logs.");
        } catch (Throwable $e) {
            error_log("General Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ A critical error occurred. Please check the server logs.");
        }
    } else {
        sendMessage($chat_id, "Invalid command format. Use:\n/add_score [player_id] [points]\n/set_score [player_id] [points]");
    }
}

?>
