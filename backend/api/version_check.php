<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// ##################################################################
// # 版本管理中心
// ##################################################################
// # 当您发布新版本的APP时，只需要修改这里的几个值。
// ##################################################################

// --- 配置区 ---

// 最新版本的版本名 (例如: "1.1.0")
$latestVersionName = "1.1.0"; 

// 最新的版本号 (必须是一个整数，每次发布新版时，这个数字必须比上一个版本大)
$latestVersionCode = 2; 

// 您的APK下载页面的完整URL
$downloadUrl = "https://github.com/wen952222/wcn/releases"; // 这是一个示例，请替换成您的真实下载地址

// 新版本的更新日志 (将显示在提示框中)
$releaseNotes = [
    "新增：用户积分系统上线！",
    "优化：游戏界面性能，操作更流畅。",
    "修复：解决了部分机型闪退的问题。"
];

// --- 逻辑区 ---

$response = [
    'success' => true,
    'latestVersion' => $latestVersionName,
    'latestVersionCode' => $latestVersionCode,
    'downloadUrl' => $downloadUrl,
    'releaseNotes' => $releaseNotes
];

echo json_encode($response);
?>
