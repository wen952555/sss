<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Zodiac map for number translation
const ZODIAC_MAP = [
    '鼠' => ['01', '13', '25', '37', '49'],
    '牛' => ['12', '24', '36', '48'],
    '虎' => ['11', '23', '35', '47'],
    '兔' => ['10', '22', '34', '46'],
    '龙' => ['09', '21', '33', '45'],
    '蛇' => ['08', '20', '32', '44'],
    '马' => ['07', '19', '31', '43'],
    '羊' => ['06', '18', '30', '42'],
    '猴' => ['05', '17', '29', '41'],
    '鸡' => ['04', '16', '28', '40'],
    '狗' => ['03', '15', '27', '39'],
    '猪' => ['02', '14', '26', '38'],
];

function parse_betting_slip($text) {
    $lines = explode("\n", trim($text));
    $parsed_data = [];

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) {
            continue;
        }

        $matched = false;

        // Pattern 1: Region-specific number lists
        if (preg_match('/^(澳门|香港)：?([\d\.,\s]+)各(\d+)(?:元|块)/u', $line, $matches)) {
            $region = $matches[1];
            $numbers_str = $matches[2];
            $amount = (int)$matches[3];
            preg_match_all('/\d+/', $numbers_str, $number_matches);
            $numbers = $number_matches[0];

            $parsed_data[] = [
                'region' => $region,
                'type' => '号码列表',
                'content' => $numbers_str,
                'numbers' => $numbers,
                'amount_per_number' => $amount,
                'original_text' => $line
            ];
            $matched = true;
        }

        // Pattern 2: Zodiac signs
        if (!$matched && preg_match('/^([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)各数(\d+)(?:元|块)/u', $line, $matches)) {
            $zodiacs_str = $matches[1];
            $amount = (int)$matches[2];
            $all_numbers = [];
            $zodiac_chars = preg_split('/(?<!^)(?!$)/u', $zodiacs_str); // Split multibyte string into characters

            foreach ($zodiac_chars as $char) {
                if (isset(ZODIAC_MAP[$char])) {
                    $all_numbers = array_merge($all_numbers, ZODIAC_MAP[$char]);
                }
            }

            $all_numbers = array_values(array_unique($all_numbers));
            sort($all_numbers);

            $parsed_data[] = [
                'region' => '通用',
                'type' => '生肖',
                'content' => $zodiacs_str,
                'numbers' => $all_numbers,
                'amount_per_number' => $amount,
                'original_text' => $line
            ];
            $matched = true;
        }

        // Pattern 3: Number range
        if (!$matched && preg_match('/^(\d+)-(\d+)各(\d+)(?:元|块)/u', $line, $matches)) {
            $start = (int)$matches[1];
            $end = (int)$matches[2];
            $amount = (int)$matches[3];
            $numbers = [];
            for ($i = $start; $i <= $end; $i++) {
                $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            }

            $parsed_data[] = [
                'region' => '通用',
                'type' => '号码范围',
                'content' => "$start-$end",
                'numbers' => $numbers,
                'amount_per_number' => $amount,
                'original_text' => $line
            ];
            $matched = true;
        }

        // Fallback for unrecognized lines
        if (!$matched) {
            $parsed_data[] = [
                'region' => '未知',
                'type' => '未识别',
                'content' => $line,
                'numbers' => [],
                'amount_per_number' => 0,
                'original_text' => $line
            ];
        }
    }

    return $parsed_data;
}

// Main script execution
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);

    if (is_null($data) || !isset($data['text'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing "text" in request body']);
        exit;
    }

    $raw_text = $data['text'];
    $structured_bets = parse_betting_slip($raw_text);
    echo json_encode($structured_bets, JSON_UNESCAPED_UNICODE);
} else {
    // Optional: Handle GET request for health check or info
    echo json_encode(['status' => 'API is running', 'message' => 'Please send a POST request to /parse']);
}
?>