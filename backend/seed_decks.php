<?php
// backend/seed_decks.php
// 运行: php seed_decks.php
require 'db.php'; // 这里面已经加载了 .env 并创建了 $pdo
require 'core/DeckGenerator.php';

echo "正在初始化牌局库...\n";

// 检查当前数量
$stmt = $pdo->query("SELECT count(*) FROM pre_decks");
$count = $stmt->fetchColumn();

if ($count >= 320) {
    echo "库存已满 ($count)，无需生成。\n";
} else {
    $needed = 320 - $count;
    echo "当前库存 $count，正在补充 $needed 局...\n";
    DeckGenerator::fill($pdo, $needed);
    echo "生成完成！\n";
}
?>