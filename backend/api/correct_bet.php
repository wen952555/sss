<?php
// backend/api/correct_bet.php

require_once 'config.php'; // Provides GEMINI_API_KEY (when added)
require_once 'bet_parser.php'; // Provides ZODIAC_MAP and other constants

header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$original_item = $data['original_item'] ?? null;
$conversation = $data['conversation'] ?? [];

if (!$original_item || empty($conversation)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing original item or conversation history."]);
    exit();
}

// --- AI Prompt Construction ---
$user_instructions = end($conversation)['text']; // Get the latest user message
$prompt = "
You are an intelligent assistant helping to correct a parsed betting slip.
The original parsed item was: " . json_encode($original_item, JSON_UNESCAPED_UNICODE) . "
The user's instruction for correction is: \"{$user_instructions}\"

Based on the instruction, please provide a JSON object with the corrected data.
The JSON object should only contain the fields that need to be changed.
For example, if the user says 'the amount should be 10', you should return:
{ \"amount_per_number\": 10 }

If the user says 'change the numbers to 1, 2, 3', you should return:
{ \"type\": \"号码\", \"content\": \"1, 2, 3\", \"numbers\": [\"01\", \"02\", \"03\"] }

If the instruction is ambiguous, ask a clarifying question in the 'reply' field of the response.
If the correction is clear, set 'correction_complete' to true and include the changes in 'updated_item'.

Your response must be a JSON object with one of two formats:
1. For clarification: { \"reply\": \"Your clarifying question here.\" }
2. For a successful correction: { \"correction_complete\": true, \"updated_item\": { ... a sub-object of corrected fields ... } }
";


// --- Placeholder AI Logic ---
// This section simulates the AI's response.
// In a real implementation, you would replace this with an actual API call to a large language model.
function get_placeholder_ai_response($instruction, $original_item) {
    // Simple keyword-based simulation
    if (preg_match('/amount|金额|元|块/', $instruction)) {
        preg_match('/\d+/', $instruction, $matches);
        $new_amount = $matches[0] ?? $original_item['amount_per_number'];
        return [
            "correction_complete" => true,
            "updated_item" => ["amount_per_number" => (int)$new_amount]
        ];
    }
    if (preg_match('/numbers|号码|数字/', $instruction)) {
        preg_match_all('/\d+/', $instruction, $matches);
        $new_numbers = $matches[0] ?? [];
        $new_numbers_padded = array_map(fn($n) => str_pad($n, 2, '0', STR_PAD_LEFT), $new_numbers);
        return [
            "correction_complete" => true,
            "updated_item" => [
                "type" => "号码",
                "content" => implode(', ', $new_numbers),
                "numbers" => $new_numbers_padded
            ]
        ];
    }

    // Default clarification response
    return ["reply" => "I'm sorry, I'm just a placeholder AI. To make me work, you'll need to add a real API key and uncomment the code in `correct_bet.php`."];
}


/*
// --- Live Google Gemini API Call (Commented Out) ---
// To enable this, you must have a Google Gemini API key set in your config.php file.
// 1. Add your key: $GEMINI_API_KEY = "...";
// 2. Uncomment the code below.
// 3. Remove the "Placeholder AI Logic" section above.

function call_gemini_api($api_key, $prompt) {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' . $api_key;

    $payload = json_encode([
        "contents" => [[
            "parts" => [["text" => $prompt]]
        ]],
        "generationConfig" => [
            "responseMimeType" => "application/json",
        ]
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    $result = curl_exec($ch);
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        return ["reply" => "API connection error: " . $error_msg];
    }
    curl_close($ch);

    $response_data = json_decode($result, true);

    // Gemini's JSON response is often wrapped in markdown, so we need to clean it.
    $ai_response_content = $response_data['candidates'][0]['content']['parts'][0]['text'] ?? null;

    if ($ai_response_content) {
        // Clean potential markdown code block fences
        $json_string = preg_replace('/^```json\s*|\s*```$/', '', $ai_response_content);
        return json_decode($json_string, true);
    }
    return ["reply" => "The AI returned an invalid response. Please try again."];
}

// $ai_response = call_gemini_api($GEMINI_API_KEY, $prompt);
*/

// Use the placeholder logic for now
$ai_response = get_placeholder_ai_response($user_instructions, $original_item);

// --- Send Final Response ---
http_response_code(200);
echo json_encode($ai_response, JSON_UNESCAPED_UNICODE);
?>