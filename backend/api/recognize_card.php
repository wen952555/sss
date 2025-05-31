<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // 允许跨域请求

// 扑克牌映射关系
$card_map = [
    '10_of_clubs' => '梅花10',
    'ace_of_spades' => '黑桃A',
    'king_of_diamonds' => '方块K',
    'queen_of_hearts' => '红桃Q',
    'jack_of_spades' => '黑桃J',
    // 添加其他扑克牌的映射...
];

// 获取上传的文件名
$filename = $_POST['filename'] ?? '';

if (empty($filename)) {
    echo json_encode(['error' => '未提供文件名']);
    exit;
}

// 提取基础文件名（不带扩展名）
$base_name = pathinfo($filename, PATHINFO_FILENAME);

// 检查是否是已知的扑克牌
if (array_key_exists($base_name, $card_map)) {
    // 检查文件是否存在于卡片库中
    $card_path = __DIR__ . '/../cards/' . $filename;
    if (file_exists($card_path)) {
        echo json_encode([
            'success' => true,
            'card_name' => $card_map[$base_name],
            'card_value' => $base_name
        ]);
        exit;
    }
}

// 未识别的情况
echo json_encode([
    'success' => false,
    'message' => '无法识别的扑克牌'
]);
?>
