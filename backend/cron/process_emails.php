<?php
// backend/cron/process_emails.php
// This script is designed to be run automatically by a cron job.

// Set a long timeout to handle many emails
set_time_limit(300);

// We are in the cron directory, so we need to go up one level to find the api directory
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/bet_parser.php';

echo "--- Starting Email Processing Cron Job at " . date('Y-m-d H:i:s') . " ---\n";

try {
    // 1. Fetch all unprocessed emails
    $stmt = $pdo->prepare("SELECT id, raw_content FROM incoming_emails WHERE status = 'new' ORDER BY created_at ASC");
    $stmt->execute();
    $emails = $stmt->fetchAll();

    if (count($emails) === 0) {
        echo "No new emails to process.\n";
        exit;
    }

    echo "Found " . count($emails) . " new emails to process.\n";

    // 2. Loop through each email and process it
    foreach ($emails as $email) {
        $email_id = $email['id'];
        echo "Processing email ID: {$email_id}...\n";

        // A simple heuristic to find the main content of the email
        // This splits the email by the first double newline, which usually separates headers from the body.
        $email_body = explode("\r\n\r\n", $email['raw_content'], 2)[1] ?? $email['raw_content'];

        // 3. Call the Bet Parser AI
        $parsed_lines = [];
        $lines = explode("\n", trim($email_body));
        foreach ($lines as $line) {
            $parsed_results = parse_betting_line($line); // This function is from bet_parser.php
            $parsed_lines = array_merge($parsed_lines, $parsed_results);
        }

        if (empty($parsed_lines)) {
            echo "  - No parsable lines found. Marking as processed.\n";
        } else {
            // 4. Save the structured results to the new table
            $insert_stmt = $pdo->prepare(
                "INSERT INTO parsed_bet_slips (email_id, region, bet_type, bet_content, parsed_numbers, amount_per_bet, source_text) VALUES (?, ?, ?, ?, ?, ?, ?)"
            );

            foreach ($parsed_lines as $slip) {
                $insert_stmt->execute([
                    $email_id,
                    $slip['region'],
                    $slip['type'],
                    $slip['content'],
                    json_encode($slip['numbers']),
                    $slip['amount_per_number'],
                    $slip['original_text']
                ]);
            }
            echo "  - Successfully parsed and saved " . count($parsed_lines) . " bet slips.\n";
        }

        // 5. Mark the email as 'processed'
        $update_stmt = $pdo->prepare("UPDATE incoming_emails SET status = 'processed' WHERE id = ?");
        $update_stmt->execute([$email_id]);
        echo "  - Marked email as 'processed'.\n";
    }

} catch (PDOException $e) {
    // Log the error for the system administrator
    error_log("Cron Job Error: " . $e->getMessage());
    echo "A database error occurred. Check the server logs.\n";
}

echo "--- Email Processing Cron Job Finished at " . date('Y-m-d H:i:s') . " ---\n";
?>