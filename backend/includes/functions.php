<?php
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function json_response($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
