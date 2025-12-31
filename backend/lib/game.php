<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cards.php';

class Game {
    private $conn;
    private $table = 'games';

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // 创建新游戏
    public function createGame($player_ids, $initial_points = 100) {
        if (count($player_ids) < 2 || count($player_ids) > 4) {
            return ['error' => '玩家人数必须在2到4人之间'];
        }

        // 检查玩家是否存在并且积分充足
        $players_data = [];
        foreach ($player_ids as $pid) {
            $query = "SELECT user_id, points FROM users WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $pid);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return ['error' => "玩家 {$pid} 不存在"];
            }
            if ($user['points'] < $initial_points) {
                return ['error' => "玩家 {$pid} 积分不足"];
            }
            $players_data[] = $user;
        }

        // 为每个玩家发牌
        $hands = Cards::dealCards(count($player_ids));
        
        $game_state = [];
        foreach ($player_ids as $index => $pid) {
            $game_state[$pid] = [
                'hand' => $hands[$index],
                'submitted' => false,
                'front_hand' => [],
                'middle_hand' => [],
                'back_hand' => [],
                'score' => 0
            ];
        }

        $game_id = $this->generateGameId();
        $game_state_json = json_encode($game_state);
        $player_ids_json = json_encode($player_ids);

        // 开始事务
        $this->conn->beginTransaction();
        try {
            // 扣除初始积分
            foreach ($players_data as $player) {
                $query = "UPDATE users SET points = points - :points WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':points', $initial_points);
                $stmt->bindParam(':user_id', $player['user_id']);
                $stmt->execute();
            }

            // 创建游戏记录
            $query = "INSERT INTO " . $this->table . " (game_id, players, game_state, status) 
                      VALUES (:game_id, :players, :game_state, 'active')";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':game_id', $game_id);
            $stmt->bindParam(':players', $player_ids_json);
            $stmt->bindParam(':game_state', $game_state_json);
            $stmt->execute();
            
            $this->conn->commit();
            
            return [
                'game_id' => $game_id,
                'players' => $player_ids,
                'game_state' => $game_state
            ];

        } catch (Exception $e) {
            $this->conn->rollBack();
            return ['error' => '创建游戏失败: ' . $e->getMessage()];
        }
    }

    // 获取游戏状态
    public function getGameState($game_id) {
        $query = "SELECT * FROM " . $this->table . " WHERE game_id = :game_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->execute();

        $game = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($game) {
            $game['players'] = json_decode($game['players'], true);
            $game['game_state'] = json_decode($game['game_state'], true);
            return $game;
        }
        return null;
    }

    // 玩家提交牌组
    public function submitHand($game_id, $player_id, $front_hand, $middle_hand, $back_hand) {
        $game = $this->getGameState($game_id);
        if (!$game) {
            return ['error' => '游戏不存在'];
        }
        if ($game['status'] !== 'active') {
            return ['error' => '游戏已结束'];
        }
        
        $game_state = $game['game_state'];
        if (!isset($game_state[$player_id])) {
            return ['error' => '你不在这个游戏中'];
        }
        if ($game_state[$player_id]['submitted']) {
            return ['error' => '你已经提交过牌组了'];
        }
        
        // 验证牌组
        $player_hand = $game_state[$player_id]['hand'];
        $submitted_cards = array_merge($front_hand, $middle_hand, $back_hand);
        
        if (count($submitted_cards) != 13 || count(array_diff($submitted_cards, $player_hand)) > 0) {
            return ['error' => '提交的牌组不合法'];
        }
        
        // 验证牌型规则 (此处省略复杂的牌型验证逻辑，仅做基本张数检查)
        if (count($front_hand) != 3 || count($middle_hand) != 5 || count($back_hand) != 5) {
            return ['error' => '牌墩的牌数不正确'];
        }

        // 更新游戏状态
        $game_state[$player_id]['submitted'] = true;
        $game_state[$player_id]['front_hand'] = $front_hand;
        $game_state[$player_id]['middle_hand'] = $middle_hand;
        $game_state[$player_id]['back_hand'] = $back_hand;
        
        // 检查是否所有玩家都提交了
        $all_submitted = true;
        foreach ($game_state as $pid => $state) {
            if (!$state['submitted']) {
                $all_submitted = false;
                break;
            }
        }
        
        // 如果所有人都提交了，进行结算
        if ($all_submitted) {
            $game_state = $this->calculateScores($game_state);
            $this->endGame($game_id, $game_state);
            $game['status'] = 'completed';
        }

        // 更新数据库
        $query = "UPDATE " . $this->table . " SET game_state = :game_state, status = :status WHERE game_id = :game_id";
        $stmt = $this->conn->prepare($query);
        $game_state_json = json_encode($game_state);
        $stmt->bindParam(':game_state', $game_state_json);
        $stmt->bindParam(':status', $game['status']);
        $stmt->bindParam(':game_id', $game_id);
        $stmt->execute();
        
        return [
            'success' => true,
            'game_state' => $game_state,
            'all_submitted' => $all_submitted
        ];
    }
    
    // 结算逻辑 (简化版)
    private function calculateScores($game_state) {
        // 此处应包含复杂的十三水比牌和计分逻辑
        // 为简化示例，我们只随机给一个分数
        foreach ($game_state as $pid => &$state) {
            $state['score'] = rand(-10, 10);
        }
        return $game_state;
    }

    // 结束游戏并结算积分
    private function endGame($game_id, $final_game_state) {
        $this->conn->beginTransaction();
        try {
            foreach ($final_game_state as $player_id => $state) {
                $score = $state['score'];
                // 更新用户积分
                $query = "UPDATE users SET points = points + :score WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':score', $score);
                $stmt->bindParam(':user_id', $player_id);
                $stmt->execute();

                // 记录交易
                $type = $score >= 0 ? 'game_win' : 'game_loss';
                $abs_score = abs($score);
                $description = "游戏 {$game_id} 结算";

                $query = "INSERT INTO transactions (from_user_id, to_user_id, points, type, description) 
                          VALUES (:from, :to, :points, :type, :desc)";
                $stmt = $this->conn->prepare($query);
                
                if ($score >= 0) {
                    $stmt->bindValue(':from', 'system');
                    $stmt->bindValue(':to', $player_id);
                } else {
                    $stmt->bindValue(':from', $player_id);
                    $stmt->bindValue(':to', 'system');
                }
                $stmt->bindParam(':points', $abs_score);
                $stmt->bindParam(':type', $type);
                $stmt->bindParam(':desc', $description);
                $stmt->execute();
            }
            $this->conn->commit();
        } catch (Exception $e) {
            $this->conn->rollBack();
            // 记录错误日志
        }
    }

    // 生成唯一游戏ID
    private function generateGameId($length = 8) {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyz';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }
}
?>