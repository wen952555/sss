<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/db.php';

class TelegramBot {
    private $token;
    private $bot_id;
    private $conn;

    public function __construct() {
        $this->token = TELEGRAM_BOT_TOKEN;
        $this->bot_id = TELEGRAM_BOT_ID;
        
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // 发送消息
    public function sendMessage($chat_id, $text, $parse_mode = 'HTML') {
        $url = "https://api.telegram.org/bot" . $this->token . "/sendMessage";
        $data = [
            'chat_id' => $chat_id,
            'text' => $text,
            'parse_mode' => $parse_mode
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    // 设置webhook
    public function setWebhook($url) {
        $url = "https://api.telegram.org/bot" . $this->token . "/setWebhook";
        $data = [
            'url' => $url
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    // 处理webhook更新
    public function processUpdate($update) {
        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chat_id = $message['chat']['id'];
        $text = isset($message['text']) ? $message['text'] : '';
        
        // 检查是否为管理员
        if (!in_array($chat_id, ADMIN_TELEGRAM_IDS)) {
            $this->sendMessage($chat_id, "❌ 您不是管理员，无法使用此机器人。");
            return;
        }

        // 处理命令
        $commands = explode(' ', $text);
        $command = strtolower($commands[0]);

        switch ($command) {
            case '/start':
                $this->sendMessage($chat_id, "👑 十三水游戏管理机器人\n\n可用命令：\n/users - 查看所有用户\n/search [手机号] - 搜索用户\n/delete [用户ID] - 删除用户\n/points [用户ID] [积分] - 设置用户积分\n/add_points [用户ID] [积分] - 增加积分\n/sub_points [用户ID] [积分] - 减少积分");
                break;

            case '/users':
                $this->showAllUsers($chat_id);
                break;

            case '/search':
                if (isset($commands[1])) {
                    $this->searchUser($chat_id, $commands[1]);
                } else {
                    $this->sendMessage($chat_id, "请输入手机号进行搜索：/search 13800138000");
                }
                break;

            case '/delete':
                if (isset($commands[1])) {
                    $this->deleteUser($chat_id, $commands[1]);
                } else {
                    $this->sendMessage($chat_id, "请输入用户ID：/delete abcd");
                }
                break;

            case '/points':
                if (isset($commands[1]) && isset($commands[2]) && is_numeric($commands[2])) {
                    $this->setPoints($chat_id, $commands[1], $commands[2]);
                } else {
                    $this->sendMessage($chat_id, "使用方法：/points [用户ID] [积分]");
                }
                break;

            case '/add_points':
                if (isset($commands[1]) && isset($commands[2]) && is_numeric($commands[2])) {
                    $this->adjustPoints($chat_id, $commands[1], $commands[2], 'add');
                } else {
                    $this->sendMessage($chat_id, "使用方法：/add_points [用户ID] [积分]");
                }
                break;

            case '/sub_points':
                if (isset($commands[1]) && isset($commands[2]) && is_numeric($commands[2])) {
                    $this->adjustPoints($chat_id, $commands[1], $commands[2], 'sub');
                } else {
                    $this->sendMessage($chat_id, "使用方法：/sub_points [用户ID] [积分]");
                }
                break;

            default:
                if (strpos($text, '/') === 0) {
                    $this->sendMessage($chat_id, "未知命令。使用 /start 查看可用命令。");
                }
                break;
        }
    }

    // 显示所有用户
    private function showAllUsers($chat_id) {
        $query = "SELECT user_id, phone, points, created_at FROM users ORDER BY created_at DESC LIMIT 50";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($users)) {
            $this->sendMessage($chat_id, "暂无用户数据。");
            return;
        }

        $message = "📋 用户列表 (共" . count($users) . "人)：\n\n";
        
        foreach ($users as $user) {
            $message .= "🆔: <code>" . $user['user_id'] . "</code>\n";
            $message .= "📱: " . $user['phone'] . "\n";
            $message .= "💰: " . $user['points'] . " 积分\n";
            $message .= "⏰: " . date('Y-m-d H:i', strtotime($user['created_at'])) . "\n";
            $message .= "─\n";
        }

        $this->sendMessage($chat_id, $message);
    }

    // 搜索用户
    private function searchUser($chat_id, $phone) {
        $query = "SELECT user_id, phone, points, created_at FROM users WHERE phone LIKE :phone LIMIT 10";
        $stmt = $this->conn->prepare($query);
        $searchPhone = '%' . $phone . '%';
        $stmt->bindParam(':phone', $searchPhone);
        $stmt->execute();

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($users)) {
            $this->sendMessage($chat_id, "未找到手机号包含 '{$phone}' 的用户。");
            return;
        }

        $message = "🔍 搜索结果：\n\n";
        
        foreach ($users as $user) {
            $message .= "🆔: <code>" . $user['user_id'] . "</code>\n";
            $message .= "📱: " . $user['phone'] . "\n";
            $message .= "💰: " . $user['points'] . " 积分\n";
            $message .= "⏰: " . date('Y-m-d H:i', strtotime($user['created_at'])) . "\n";
            $message .= "─\n";
        }

        $this->sendMessage($chat_id, $message);
    }

    // 删除用户
    private function deleteUser($chat_id, $user_id) {
        $query = "DELETE FROM users WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                $this->sendMessage($chat_id, "✅ 用户 <code>{$user_id}</code> 已成功删除。");
            } else {
                $this->sendMessage($chat_id, "❌ 用户 <code>{$user_id}</code> 不存在。");
            }
        } else {
            $this->sendMessage($chat_id, "❌ 删除用户失败。");
        }
    }

    // 设置用户积分
    private function setPoints($chat_id, $user_id, $points) {
        $query = "UPDATE users SET points = :points WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':points', $points);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                $this->sendMessage($chat_id, "✅ 用户 <code>{$user_id}</code> 的积分已设置为 {$points}。");
            } else {
                $this->sendMessage($chat_id, "❌ 用户 <code>{$user_id}</code> 不存在。");
            }
        } else {
            $this->sendMessage($chat_id, "❌ 设置积分失败。");
        }
    }

    // 调整用户积分
    private function adjustPoints($chat_id, $user_id, $points, $operation) {
        // 先获取当前积分
        $query = "SELECT points FROM users WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        if ($stmt->rowCount() == 0) {
            $this->sendMessage($chat_id, "❌ 用户 <code>{$user_id}</code> 不存在。");
            return;
        }
        
        $current = $stmt->fetch(PDO::FETCH_ASSOC);
        $current_points = $current['points'];
        
        if ($operation == 'add') {
            $new_points = $current_points + $points;
        } else {
            $new_points = $current_points - $points;
            if ($new_points < 0) $new_points = 0;
        }
        
        $query = "UPDATE users SET points = :points WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':points', $new_points);
        
        if ($stmt->execute()) {
            $operation_text = $operation == 'add' ? '增加' : '减少';
            $this->sendMessage($chat_id, "✅ 用户 <code>{$user_id}</code> 积分{$operation_text}成功\n原积分：{$current_points}\n{$operation_text}：{$points}\n新积分：{$new_points}");
        } else {
            $this->sendMessage($chat_id, "❌ 调整积分失败。");
        }
    }
}
?>