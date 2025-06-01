<?php
require_once 'GameLogic.php';

class GameManager {
    private $dataDir = __DIR__ . '/data/'; // 确保此目录存在且PHP可写

    public function __construct() {
        if (!is_dir($this->dataDir)) {
            mkdir($this->dataDir, 0775, true);
        }
    }

    private function getGameFilePath($gameId) {
        return $this->dataDir . $gameId . '.json';
    }

    private function loadGame($gameId) {
        $filePath = $this->getGameFilePath($gameId);
        if (file_exists($filePath)) {
            $gameData = json_decode(file_get_contents($filePath), true);
            // 将牌组数据转换回Card对象
            if (isset($gameData['players'])) {
                foreach ($gameData['players'] as &$player) {
                    if (isset($player['hand_simple'])) {
                        $player['hand'] = GameLogic::simpleArrayToCards($player['hand_simple']);
                    }
                    if (isset($player['arrangement_simple'])) {
                        $player['arrangement']['front'] = GameLogic::simpleArrayToCards($player['arrangement_simple']['front']);
                        $player['arrangement']['middle'] = GameLogic::simpleArrayToCards($player['arrangement_simple']['middle']);
                        $player['arrangement']['back'] = GameLogic::simpleArrayToCards($player['arrangement_simple']['back']);
                    }
                }
            }
            return $gameData;
        }
        return null;
    }

    private function saveGame($gameId, $gameData) {
        // 在保存前，将Card对象转换为简单数组
        $gameDataToSave = $gameData; //
        if (isset($gameDataToSave['players'])) {
             foreach ($gameDataToSave['players'] as &$player) {
                if (isset($player['hand']) && is_array($player['hand'])) {
                     $player['hand_simple'] = GameLogic::cardsToSimpleArray($player['hand']);
                     unset($player['hand']); // 移除对象数组，避免JSON编码问题或过大文件
                }
                if (isset($player['arrangement']) && is_array($player['arrangement'])) {
                    $player['arrangement_simple']['front'] = GameLogic::cardsToSimpleArray($player['arrangement']['front']);
                    $player['arrangement_simple']['middle'] = GameLogic::cardsToSimpleArray($player['arrangement']['middle']);
                    $player['arrangement_simple']['back'] = GameLogic::cardsToSimpleArray($player['arrangement']['back']);
                    unset($player['arrangement']);
                }
            }
        }

        $filePath = $this->getGameFilePath($gameId);
        file_put_contents($filePath, json_encode($gameDataToSave, JSON_PRETTY_PRINT));
    }

    public function createGame($playerId1, $playerId2 = 'cpu') {
        $gameId = uniqid('game_');
        $logic = new GameLogic();
        $logic->shuffleDeck();

        $player1Hand = $logic->dealHand(13);
        $player2Hand = $logic->dealHand(13); // CPU或其他玩家

        $gameData = [
            'game_id' => $gameId,
            'players' => [
                $playerId1 => ['id' => $playerId1, 'hand' => $player1Hand, 'score' => 0, 'submitted' => false, 'arrangement' => null],
                $playerId2 => ['id' => $playerId2, 'hand' => $player2Hand, 'score' => 0, 'submitted' => false, 'arrangement' => null],
            ],
            'status' => 'arranging', // 'arranging', 'comparing', 'finished'
            'turn_log' => []
        ];
        $this->saveGame($gameId, $gameData);
        // 只返回给当前玩家他的手牌
        return ['success' => true, 'game_id' => $gameId, 'player_hand' => GameLogic::cardsToSimpleArray($player1Hand)];
    }

    public function submitArrangement($gameId, $playerId, $frontSimple, $middleSimple, $backSimple) {
        $gameData = $this->loadGame($gameId);
        if (!$gameData) {
            return ['success' => false, 'message' => '游戏不存在'];
        }
        if (!isset($gameData['players'][$playerId])) {
            return ['success' => false, 'message' => '玩家不存在于此游戏中'];
        }
        if ($gameData['players'][$playerId]['submitted']) {
            return ['success' => false, 'message' => '你已经提交过了'];
        }

        $logic = new GameLogic();
        $frontCards = GameLogic::simpleArrayToCards($frontSimple);
        $middleCards = GameLogic::simpleArrayToCards($middleSimple);
        $backCards = GameLogic::simpleArrayToCards($backSimple);

        // 验证提交的牌是否是玩家手牌的一部分 (重要!)
        $allSubmittedCards = array_merge($frontCards, $middleCards, $backCards);
        if (count($allSubmittedCards) !== 13) {
             return ['success' => false, 'message' => '提交的牌总数必须是13张'];
        }
        // TODO: 更严格的验证，确保提交的牌是发给玩家的牌，没有重复或外来牌。

        if (!$logic->validateArrangement($frontCards, $middleCards, $backCards)) {
            return ['success' => false, 'message' => '摆牌不符合规则 (头道牌型应小于等于中道，中道小于等于尾道，或牌数不对)'];
        }
        
        $gameData['players'][$playerId]['arrangement'] = ['front' => $frontCards, 'middle' => $middleCards, 'back' => $backCards];
        $gameData['players'][$playerId]['submitted'] = true;

        // 检查是否所有玩家都提交了
        $allSubmitted = true;
        foreach ($gameData['players'] as $p) {
            if (!$p['submitted']) {
                $allSubmitted = false;
                break;
            }
        }

        if ($allSubmitted) {
            $gameData['status'] = 'comparing';
            // 简单假设只有两个玩家 player_ids[0] vs player_ids[1]
            $playerIds = array_keys($gameData['players']);
            $p1Id = $playerIds[0];
            $p2Id = $playerIds[1];

            // 如果是CPU，模拟CPU摆牌 (这里简单随机摆，真实CPU需要AI)
            if ($p2Id === 'cpu' && !$gameData['players'][$p2Id]['arrangement']) {
                 // 简单的CPU摆牌：尝试合法摆放，可能不是最优
                $cpuHand = $gameData['players'][$p2Id]['hand']; // 这是Card对象数组
                shuffle($cpuHand); // 打乱一下增加随机性
                $cpuArrangement = [
                    'front' => array_slice($cpuHand, 0, 3),
                    'middle' => array_slice($cpuHand, 3, 5),
                    'back' => array_slice($cpuHand, 8, 5)
                ];
                // 理论上CPU也应该验证摆牌，但这里我们信任发牌和分割是正确的
                // 如果要CPU智能摆牌，需要复杂的逻辑
                if (!$logic->validateArrangement($cpuArrangement['front'], $cpuArrangement['middle'], $cpuArrangement['back'])) {
                    // 如果随机摆牌失败，尝试另一种策略或报错 (简化：直接用随机的)
                    // 这里可以尝试多次随机或者用一个固定（但可能很差）的摆法
                }
                $gameData['players'][$p2Id]['arrangement'] = $cpuArrangement;
            }


            $scoreResult = $logic->calculateScores(
                $gameData['players'][$p1Id]['arrangement'],
                $gameData['players'][$p2Id]['arrangement']
            );

            $gameData['players'][$p1Id]['score'] += $scoreResult['player1_score_change'];
            $gameData['players'][$p2Id]['score'] -= $scoreResult['player1_score_change']; // p2的分数是p1的相反数
            $gameData['turn_log'][] = $scoreResult;
            $gameData['status'] = 'finished'; // 一局结束
            
            // 为了前端展示，将双方牌型评估结果也加入
            $gameData['last_round_details'] = [
                $p1Id => $scoreResult['player1_hands'],
                $p2Id => $scoreResult['player2_hands'],
                'comparisons' => $scoreResult['comparisons'],
                'is_da_qiang' => $scoreResult['is_da_qiang'],
                'score_change' => [$p1Id => $scoreResult['player1_score_change'], $p2Id => -$scoreResult['player1_score_change']]
            ];
        }

        $this->saveGame($gameId, $gameData);
        return $this->getGameState($gameId, $playerId); // 返回更新后的游戏状态
    }

    public function getGameState($gameId, $requestingPlayerId) {
        $gameData = $this->loadGame($gameId);
        if (!$gameData) {
            return ['success' => false, 'message' => '游戏不存在'];
        }

        // 构造要返回给前端的数据，可能需要隐藏对手未提交的牌等
        $returnData = [
            'success' => true,
            'game_id' => $gameData['game_id'],
            'status' => $gameData['status'],
            'current_player_id' => $requestingPlayerId,
            'players_status' => [],
            'scores' => [],
            'last_round_details' => $gameData['last_round_details'] ?? null
        ];

        foreach ($gameData['players'] as $pid => $playerData) {
            $returnData['players_status'][$pid] = [
                'id' => $pid,
                'submitted' => $playerData['submitted'],
            ];
            $returnData['scores'][$pid] = $playerData['score'];

            // 如果游戏结束或当前玩家是请求者，显示手牌详情
            if ($gameData['status'] === 'finished' || $pid === $requestingPlayerId) {
                 if(isset($playerData['hand_simple'])) { // 优先用 simple
                    $returnData['players_status'][$pid]['hand'] = $playerData['hand_simple'];
                 } else if (isset($playerData['hand'])) {
                     $returnData['players_status'][$pid]['hand'] = GameLogic::cardsToSimpleArray($playerData['hand']);
                 }
            }
            // 如果已提交且游戏结束，显示摆好的牌
            if ($playerData['submitted'] && ($gameData['status'] === 'finished' || $gameData['status'] === 'comparing')) {
                 if(isset($playerData['arrangement_simple'])) {
                    $returnData['players_status'][$pid]['arrangement'] = $playerData['arrangement_simple'];
                 } else if (isset($playerData['arrangement'])) { // 回退
                     $returnData['players_status'][$pid]['arrangement'] = [
                        'front' => GameLogic::cardsToSimpleArray($playerData['arrangement']['front']),
                        'middle' => GameLogic::cardsToSimpleArray($playerData['arrangement']['middle']),
                        'back' => GameLogic::cardsToSimpleArray($playerData['arrangement']['back']),
                    ];
                 }
            }
        }
        return $returnData;
    }
}
?>
