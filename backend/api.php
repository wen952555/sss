<?php
require_once 'config.php';

// 处理跨域 (CORS)
header("Access-Control-Allow-Origin: {$_ENV['FRONTEND_URL']}");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

$action = $_GET['action'] ?? '';

// 1. 注册
if ($action == 'register') {
    $phone = $_POST['phone'] ?? '';
    $nick = $_POST['nickname'] ?? '';
    $pass = strtolower($_POST['password'] ?? ''); // 不限制大小写，统一转小写

    if (strlen($pass) != 6) jsonResp(400, "密码必须为6位字符");
    if (empty($phone) || empty($nick)) jsonResp(400, "请填写完整信息");

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    try {
        $stmt = $pdo->prepare("INSERT INTO users (phone, nickname, password) VALUES (?, ?, ?)");
        $stmt->execute([$phone, $nick, $hash]);
        jsonResp(200, "注册成功");
    } catch (Exception $e) {
        jsonResp(400, "手机号已被注册");
    }
}

// 2. 登录
if ($action == 'login') {
    $phone = $_POST['phone'] ?? '';
    $pass = strtolower($_POST['password'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? AND status = 'active'");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password'])) {
        unset($user['password']); // 安全起见隐藏密码
        $_SESSION['user'] = $user;
        jsonResp(200, "登录成功", $user);
    } else {
        jsonResp(400, "手机号或密码错误");
    }
}

// 3. 搜索用户 (赠送积分用)
if ($action == 'search_user') {
    $phone = $_GET['phone'] ?? '';
    $stmt = $pdo->prepare("SELECT nickname FROM users WHERE phone = ? AND status = 'active'");
    $stmt->execute([$phone]);
    $res = $stmt->fetch();
    if ($res) jsonResp(200, "获取成功", $res);
    else jsonResp(404, "用户不存在");
}

// 4. 获取大厅状态 (场次与榜单)
if ($action == 'get_lobby_status') {
    // 实时完成场次榜单
    $leaderboard = $pdo->query("SELECT nickname, (SELECT COUNT(DISTINCT carriage_id) FROM player_submissions ps WHERE ps.user_id = users.id AND is_submitted = 1) as completed_count FROM users ORDER BY completed_count DESC LIMIT 10")->fetchAll();
    
    // 报名人数统计 (示例逻辑)
    $counts = ['8pm' => rand(10, 50), '12pm' => rand(5, 20)]; 
    
    jsonResp(200, "ok", ['leaderboard' => $leaderboard, 'counts' => $counts]);
}