<?php
// --- START OF FILE api/get_announcement.php (PRODUCTION VERSION) ---

header("Content-Type: application/json");
require_once 'db_connect.php';

$result = $conn->query("SELECT content FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");

if ($result && $result->num_rows > 0) {
    $announcement = $result->fetch_assoc();
    echo json_encode(['success' => true, 'text' => $announcement['content']]);
} else {
    echo json_encode(['success' => false, 'text' => '']);
}

$conn->close();

// --- END OF FILE api/get_announcement.php (PRODUCTION VERSION) ---