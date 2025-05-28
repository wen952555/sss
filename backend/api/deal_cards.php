<?php
// backend/api/deal_cards.php
require_once '../includes/cors_config.php';
require_once '../includes/card_logic.php';

session_start(); // 可选: 如果你想在会话中保存牌局信息

$deck = createDeck();
shuffleDeck($deck);
$hand = dealHand($deck, 13);

if ($hand) {
    // 可选: 保存到会话
    // $_SESSION['current_deck'] = $deck;
    // $_SESSION['player_hand'] = $hand;
    
    http_response_code(200); // OK
    echo json_encode(['success' => true, 'hand' => $hand, 'message' => '成功获取13张手牌']);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'message' => '发牌失败，牌库不足或发生错误']);
}
