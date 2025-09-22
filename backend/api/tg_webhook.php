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

// --- Global Exception Handler ---
// This will catch any fatal errors (like a DB connection failure)
// and report them to the admin, so the bot doesn't just "go silent".
set_exception_handler('exception_handler');

function exception_handler($exception) {
    error_log("Unhandled exception: " . $exception->getMessage());

    // These might not be available if the script fails early, so we need fallbacks.
    global $TELEGRAM_BOT_TOKEN, $ADMIN_USER_IDS;

    // Try to get the chat ID from the incoming request to notify the specific admin
    $content = file_get_contents("php://input");
    $update = json_decode($content, true);
    $chat_id = $update['message']['chat']['id'] ?? ($ADMIN_USER_IDS[0] ?? null);

    if ($chat_id && $TELEGRAM_BOT_TOKEN && $TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN') {
        $error_message = "🤖 Bot Error 🤖\n\n";
        $error_message .= "An uncaught exception occurred:\n";
        $error_message .= "<b>Type:</b> " . get_class($exception) . "\n";
        $error_message .= "<b>Message:</b> " . $exception->getMessage() . "\n";
        $error_message .= "<b>File:</b> " . $exception->getFile() . "\n";
        $error_message .= "<b>Line:</b> " . $exception->getLine();

        // Use the existing sendMessage function to notify the admin
        sendMessage($chat_id, $error_message, $TELEGRAM_BOT_TOKEN);
    }
}

// Enable error reporting for debugging during development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- CONFIGURATION ---
// The BOT_TOKEN and ADMIN_IDS are now loaded from config.php
require_once 'config.php';
require_once 'telegram_helpers.php';

// --- Proactive Configuration Checks ---
if (empty($TELEGRAM_BOT_TOKEN) || $TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    error_log("FATAL: Telegram Bot Token is not configured in config.php");
    // We can't send a message without the token, so we just exit.
    exit();
}
if (empty($ADMIN_USER_IDS) || $ADMIN_USER_IDS === [123456789]) {
    sendMessage($ADMIN_USER_IDS[0], "⚠️ Configuration Warning: ADMIN_USER_IDS is not set correctly in config.php. You may not be able to receive all notifications.", $TELEGRAM_BOT_TOKEN);
}
// We can't check for a null PDO here because the script might be used for non-DB commands.
// The check is now inside the command handlers that require it.

// --- HELPER FUNCTION TO SEND A MESSAGE VIA TELEGRAM API ---
// The sendMessage function is now in telegram_helpers.php

// --- WEBHOOK PROCESSING ---

// Get the JSON payload from the request
$content = file_get_contents("php://input");
$update = json_decode($content, true);

// Log the raw update for debugging
file_put_contents('telegram_log.txt', $content . "\n", FILE_APPEND);

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
    if (!in_array($from_id, $ADMIN_USER_IDS)) {
        sendMessage($chat_id, "Sorry, you are not authorized to use this bot.", $TELEGRAM_BOT_TOKEN);
        exit();
    }

    // --- COMMAND PARSING AND EXECUTION ---

    // Handle /add_score and /set_score (3 parts)
    if (preg_match('/^\/(add_score|set_score)\s+(\S+)\s+(-?\d+)$/', $text, $matches)) {
        $command = $matches[1];
        $player_id = $matches[2];
        $points = (int)$matches[3];

        // --- Database Interaction ---
        try {
            // Database connection is already established via config.php at the top
            $stmt = null;
            if ($command === 'add_score') {
                $stmt = $pdo->prepare("UPDATE players SET score = score + ? WHERE id = ?");
            } elseif ($command === 'set_score') {
                $stmt = $pdo->prepare("UPDATE players SET score = ? WHERE id = ?");
            } else {
                sendMessage($chat_id, "Unknown command: $command", $TELEGRAM_BOT_TOKEN);
                exit();
            }

            if ($stmt) {
                $stmt->execute([$points, $player_id]);

                $affected_rows = $stmt->rowCount();

                if ($affected_rows > 0) {
                    $action_desc = ($command === 'add_score') ? "Added $points points to" : "Set score for";
                    sendMessage($chat_id, "✅ Success! $action_desc player '$player_id'.", $TELEGRAM_BOT_TOKEN);
                } else {
                    sendMessage($chat_id, "⚠️ Warning: Player '$player_id' not found or score was not changed.", $TELEGRAM_BOT_TOKEN);
                }
            }
        } catch (PDOException $e) {
            // Log the error to a file for the admin to see, not to the user.
            error_log("Database Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ An error occurred with the database. Please check the server logs.", $TELEGRAM_BOT_TOKEN);
        } catch (Throwable $e) {
            error_log("General Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ A critical error occurred. Please check the server logs.", $TELEGRAM_BOT_TOKEN);
        }
    }
    // Handle /delete_user (2 parts)
    else if (preg_match('/^\/(delete_user)\s+(\S+)$/', $text, $matches)) {
        $command = $matches[1];
        $username = $matches[2];

        try {
            if (!$pdo) {
                throw new Exception("Database connection is not available.");
            }
            $stmt = $pdo->prepare("DELETE FROM users WHERE username = ?");
            $stmt->execute([$username]);

            if ($stmt->rowCount() > 0) {
                sendMessage($chat_id, "✅ Success! User '$username' has been deleted.", $TELEGRAM_BOT_TOKEN);
            } else {
                sendMessage($chat_id, "⚠️ User '$username' not found.", $TELEGRAM_BOT_TOKEN);
            }
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ An error occurred with the database.", $TELEGRAM_BOT_TOKEN);
        } catch (Throwable $e) {
            error_log("General Error: " . $e->getMessage());
            sendMessage($chat_id, "❌ A critical error occurred.", $TELEGRAM_BOT_TOKEN);
        }

    } else {
        sendMessage($chat_id, "Invalid command format. Use:\n/add_score [player_id] [points]\n/set_score [player_id] [points]\n/delete_user [username]", $TELEGRAM_BOT_TOKEN);
    }
}

?>
