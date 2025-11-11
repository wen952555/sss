<?php
// check_syntax.php
header("Content-Type: text/plain");

function checkPhpSyntax($file) {
    $output = shell_exec("php -l " . escapeshellarg($file) . " 2>&1");
    return $output;
}

$files = [
    'api.php',
    'db.php', 
    'handlers/user_handler.php',
    'handlers/game_handler.php',
    'handlers/telegram_handler.php',
    'telegram_webhook.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "Checking: $file\n";
        echo checkPhpSyntax($file) . "\n";
        echo "---\n";
    } else {
        echo "File not found: $file\n";
        echo "---\n";
    }
}
?>