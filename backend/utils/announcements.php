<?php
// backend/utils/announcements.php

function getLatestAnnouncement($conn) {
    $query = "SELECT message_text FROM tg_announcements WHERE status = 'published' ORDER BY created_at DESC LIMIT 1";
    $result = $conn->query($query);
    if ($result && $result->num_rows > 0) {
        $announcement = $result->fetch_assoc();
        return $announcement['message_text'];
    }
    return null;
}

function createAnnouncement($conn, $message) {
    $stmt = $conn->prepare("INSERT INTO tg_announcements (message_text) VALUES (?)");
    $stmt->bind_param("s", $message);
    $stmt->execute();
    $stmt->close();
}

function deleteAnnouncement($conn, $announcementId) {
    $stmt = $conn->prepare("UPDATE tg_announcements SET status = 'deleted' WHERE id = ?");
    $stmt->bind_param("i", $announcementId);
    $stmt->execute();
    return $stmt->affected_rows > 0;
}
?>
