<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$action = $_GET['action'] ?? '';
$db = new Database();
$auth = new Auth($db);

// 验证JWT令牌
$token = getBearerToken();
if (!$auth->validateToken($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $auth->getUserIdFromToken($token);

switch ($action) {
    case 'create':
        createGame($db, $userId);
        break;
    case 'join':
        joinGame($db, $userId);
        break;
    case 'state':
        getGameState($db, $userId);
        break;
    case 'arrange':
        arrangeCards($db, $userId);
        break;
    case 'ai-arrange':
        aiArrangeCards($db, $userId);
        break;
    case 'ready':
        setReadyStatus($db, $userId);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}

function createGame($db, $userId) {
    $gameId = uniqid();
    $db->query("INSERT INTO games (id) VALUES (?)", [$gameId]);
    $db->query("INSERT INTO game_players (game_id, user_id) VALUES (?, ?)", [$gameId, $userId]);
    
    // 初始化玩家手牌
    $cards = generateShuffledDeck();
    $playerCards = array_slice($cards, 0, 13);
    $remainingCards = array_slice($cards, 13);
    
    $db->query("UPDATE game_players SET cards = ? WHERE game_id = ? AND user_id = ?", 
        [json_encode($playerCards), $gameId, $userId]);
    
    echo json_encode(['gameId' => $gameId, 'cards' => $playerCards]);
}

function joinGame($db, $userId) {
    $gameId = $_POST['gameId'] ?? '';
    
    // 检查游戏是否存在并可加入
    $game = $db->query("SELECT * FROM games WHERE id = ? AND status = 'waiting'", [$gameId])->fetch();
    if (!$game) {
        http_response_code(400);
        echo json_encode(['error' => 'Game not found or already started']);
        return;
    }
    
    // 检查是否已经加入
    $existingPlayer = $db->query("SELECT * FROM game_players WHERE game_id = ? AND user_id = ?", 
        [$gameId, $userId])->fetch();
    if ($existingPlayer) {
        echo json_encode(['gameId' => $gameId, 'cards' => json_decode($existingPlayer['cards'], true)]);
        return;
    }
    
    // 获取剩余牌堆
    $players = $db->query("SELECT cards FROM game_players WHERE game_id = ?", [$gameId])->fetchAll();
    $usedCards = [];
    foreach ($players as $player) {
        $usedCards = array_merge($usedCards, json_decode($player['cards'], true));
    }
    
    $allCards = generateShuffledDeck();
    $remainingCards = array_values(array_diff($allCards, $usedCards));
    
    if (count($remainingCards) < 13) {
        http_response_code(400);
        echo json_encode(['error' => 'Not enough cards left to join']);
        return;
    }
    
    $playerCards = array_slice($remainingCards, 0, 13);
    $db->query("INSERT INTO game_players (game_id, user_id, cards) VALUES (?, ?, ?)", 
        [$gameId, $userId, json_encode($playerCards)]);
    
    echo json_encode(['gameId' => $gameId, 'cards' => $playerCards]);
}

function getGameState($db, $userId) {
    $gameId = $_GET['gameId'] ?? '';
    
    $game = $db->query("SELECT * FROM games WHERE id = ?", [$gameId])->fetch();
    if (!$game) {
        http_response_code(404);
        echo json_encode(['error' => 'Game not found']);
        return;
    }
    
    $players = $db->query("
        SELECT gp.user_id, u.phone, gp.ready, gp.cards, gp.arrangement, gp.score 
        FROM game_players gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = ?
    ", [$gameId])->fetchAll();
    
    $response = [
        'status' => $game['status'],
        'players' => array_map(function($player) use ($userId) {
            return [
                'id' => $player['user_id'],
                'name' => $player['phone'],
                'ready' => (bool)$player['ready'],
                'cards' => $player['user_id'] == $userId ? json_decode($player['cards'], true) : null,
                'arrangement' => $player['arrangement'] ? json_decode($player['arrangement'], true) : null,
                'score' => $player['score']
            ];
        }, $players)
    ];
    
    echo json_encode($response);
}

function arrangeCards($db, $userId) {
    $gameId = $_POST['gameId'] ?? '';
    $arrangement = $_POST['arrangement'] ?? [];
    
    if (!is_array($arrangement)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid arrangement']);
        return;
    }
    
    $db->query("UPDATE game_players SET arrangement = ? WHERE game_id = ? AND user_id = ?", 
        [json_encode($arrangement), $gameId, $userId]);
    
    echo json_encode(['success' => true]);
}

function aiArrangeCards($db, $userId) {
    $gameId = $_POST['gameId'] ?? '';
    
    // 获取玩家当前手牌
    $player = $db->query("SELECT cards FROM game_players WHERE game_id = ? AND user_id = ?", 
        [$gameId, $userId])->fetch();
    if (!$player) {
        http_response_code(404);
        echo json_encode(['error' => 'Player not found in game']);
        return;
    }
    
    $cards = json_decode($player['cards'], true);
    
    // AI分牌逻辑
    $arrangement = aiArrangeCardsLogic($cards);
    
    $db->query("UPDATE game_players SET arrangement = ? WHERE game_id = ? AND user_id = ?", 
        [json_encode($arrangement), $gameId, $userId]);
    
    echo json_encode(['cards' => $cards, 'arrangement' => $arrangement]);
}

function setReadyStatus($db, $userId) {
    $gameId = $_POST['gameId'] ?? '';
    
    $db->query("UPDATE game_players SET ready = TRUE WHERE game_id = ? AND user_id = ?", 
        [$gameId, $userId]);
    
    // 检查是否所有玩家都准备好了
    $players = $db->query("SELECT ready FROM game_players WHERE game_id = ?", [$gameId])->fetchAll();
    $allReady = true;
    foreach ($players as $player) {
        if (!$player['ready']) {
            $allReady = false;
            break;
        }
    }
    
    if ($allReady && count($players) >= 2) {
        // 开始游戏
        $db->query("UPDATE games SET status = 'playing' WHERE id = ?", [$gameId]);
        // 这里可以添加计算得分的逻辑
    }
    
    echo json_encode(['success' => true]);
}

function generateShuffledDeck() {
    $suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    $ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
    
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['suit' => $suit, 'rank' => $rank];
        }
    }
    
    shuffle($deck);
    return $deck;
}

function aiArrangeCardsLogic($cards) {
    // 简单的AI分牌逻辑 - 实际可以更复杂
    usort($cards, function($a, $b) {
        // 先按花色排序，再按点数排序
        $suitOrder = ['spades' => 4, 'hearts' => 3, 'clubs' => 2, 'diamonds' => 1];
        if ($suitOrder[$a['suit']] != $suitOrder[$b['suit']]) {
            return $suitOrder[$b['suit']] - $suitOrder[$a['suit']];
        }
        return $b['rank'] - $a['rank'];
    });
    
    // 分成三墩：5张、5张、3张
    $arrangement = [
        'front' => array_slice($cards, 0, 3),
        'middle' => array_slice($cards, 3, 5),
        'back' => array_slice($cards, 8, 5)
    ];
    
    return $arrangement;
}

function getBearerToken() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}
?>
