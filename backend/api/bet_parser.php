<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Handle pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Constants ---

// Zodiac map for number translation
const ZODIAC_MAP = [
    '蛇' => ['01', '13', '25', '37', '49'],
    '龙' => ['02', '14', '26', '38'],
    '兔' => ['03', '15', '27', '39'],
    '虎' => ['04', '16', '28', '40'],
    '牛' => ['05', '17', '29', '41'],
    '鼠' => ['06', '18', '30', '42'],
    '猪' => ['07', '19', '31', '43'],
    '狗' => ['08', '20', '32', '44'],
    '鸡' => ['09', '21', '33', '45'],
    '猴' => ['10', '22', '34', '46'],
    '羊' => ['11', '23', '35', '47'],
    '马' => ['12', '24', '36', '48'],
];

// Color groups for numbers
const COLOR_MAP = [
    '红波' => ['01', '02', '07', '08', '12', '13', '18', '19', '23', '24', '29', '30', '34', '35', '40', '45', '46'],
    '蓝波' => ['03', '04', '09', '10', '14', '15', '20', '25', '26', '31', '36', '37', '41', '42', '47', '48'],
    '绿波' => ['05', '06', '11', '16', '17', '21', '22', '27', '28', '32', '33', '38', '39', '43', '44', '49'],
];

// --- Helper Functions ---

/**
 * Parses a line of text to extract betting information.
 * This is the core "AI" logic.
 *
 * @param string $line The line of text to parse.
 * @return array An array of parsed bet data.
 */
function parse_betting_line($line) {
    $line = trim($line);
    if (empty($line)) {
        return [];
    }

    $parsed_data = [];
    $original_line = $line;

    // Normalize and extract amount first - this is a key piece of information
    $amount = 0;
    $amount_match = [];
    // Flexible regex for amount, e.g., "各5元", "各 5块", "每注5元"
    if (preg_match('/(?:各|各数|每注)\s*(\d+)\s*(?:元|块)/u', $line, $amount_match)) {
        $amount = (int)$amount_match[1];
        // Remove the amount part to simplify further parsing
        $line = trim(str_replace($amount_match[0], '', $line));
    } else {
         $parsed_data[] = create_unrecognized_bet($original_line, "找不到金额");
         return $parsed_data;
    }

    // Extract region if specified
    $region = '通用';
    $region_match = [];
    if (preg_match('/^(澳门|香港)[:：]?\s*/u', $line, $region_match)) {
        $region = $region_match[1];
        $line = trim(str_replace($region_match[0], '', $line));
    }

    // --- Tokenize and Parse Content ---
    // Split by common delimiters like comma, period, space
    $tokens = preg_split('/[\s,\.，．]+/u', $line, -1, PREG_SPLIT_NO_EMPTY);

    foreach ($tokens as $token) {
        $matched = false;

        // 1. Zodiac Signs
        if (isset(ZODIAC_MAP[$token])) {
            $parsed_data[] = create_bet_entry($region, '生肖', $token, ZODIAC_MAP[$token], $amount, $original_line);
            $matched = true;
            continue;
        }

        // 2. Color Bets
        if (isset(COLOR_MAP[$token])) {
            $parsed_data[] = create_bet_entry($region, '色波', $token, COLOR_MAP[$token], $amount, $original_line);
            $matched = true;
            continue;
        }

        // 3. Bet Types (Odd, Even, Big, Small)
        if (in_array($token, ['单', '双', '大', '小'])) {
            $numbers = get_special_numbers($token);
            $parsed_data[] = create_bet_entry($region, '类型', $token, $numbers, $amount, $original_line);
            $matched = true;
            continue;
        }

        // 4. Number Range (e.g., 06-36)
        if (preg_match('/^(\d+)-(\d+)$/', $token, $range_match)) {
            $start = (int)$range_match[1];
            $end = (int)$range_match[2];
            $numbers = [];
            for ($i = $start; $i <= $end; $i++) {
                $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            }
            $parsed_data[] = create_bet_entry($region, '号码范围', $token, $numbers, $amount, $original_line);
            $matched = true;
            continue;
        }

        // 5. Individual Numbers
        if (is_numeric($token)) {
             $parsed_data[] = create_bet_entry($region, '号码', $token, [str_pad($token, 2, '0', STR_PAD_LEFT)], $amount, $original_line);
             $matched = true;
             continue;
        }

        // If no match after all checks
        if (!$matched) {
            $parsed_data[] = create_unrecognized_bet($original_line, "无法识别的内容: '{$token}'");
        }
    }

    return $parsed_data;
}

/**
 * Creates a structured array for a successfully parsed bet.
 */
function create_bet_entry($region, $type, $content, $numbers, $amount, $original_text) {
    return [
        'region' => $region,
        'type' => $type,
        'content' => $content,
        'numbers' => $numbers,
        'amount_per_number' => $amount,
        'original_text' => $original_text
    ];
}

/**
 * Creates a structured array for an unrecognized bet.
 */
function create_unrecognized_bet($original_text, $reason = "未识别") {
    return [
        'region' => '未知',
        'type' => '未识别',
        'content' => $original_text,
        'numbers' => [],
        'amount_per_number' => 0,
        'original_text' => "{$original_text} - [原因: {$reason}]"
    ];
}


/**
 * Generates number lists for special bet types (Odd, Even, Big, Small).
 * @param string $type - e.g., '单', '双', '大', '小'
 * @return array
 */
function get_special_numbers($type) {
    $numbers = [];
    switch ($type) {
        case '单':
            for ($i = 1; $i <= 49; $i++) if ($i % 2 != 0) $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            break;
        case '双':
            for ($i = 1; $i <= 49; $i++) if ($i % 2 == 0) $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            break;
        case '大':
            for ($i = 25; $i <= 49; $i++) $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            break;
        case '小':
            for ($i = 1; $i <= 24; $i++) $numbers[] = str_pad($i, 2, '0', STR_PAD_LEFT);
            break;
    }
    return $numbers;
}

// --- Main Script Execution ---
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);

    if (is_null($data) || !isset($data['text'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing "text" in request body']);
        exit;
    }

    $raw_text = $data['text'];
    $lines = explode("\n", trim($raw_text));
    $structured_bets = [];
    foreach ($lines as $line) {
        $parsed_results = parse_betting_line($line);
        $structured_bets = array_merge($structured_bets, $parsed_results);
    }

    echo json_encode($structured_bets, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} else {
    // Optional: Handle GET request for health check or info
    echo json_encode(['status' => 'API is running', 'message' => 'Please send a POST request to /parse']);
}
?>