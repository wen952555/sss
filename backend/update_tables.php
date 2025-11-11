<?php
// update_tables.php
header("Content-Type: text/plain");

require_once __DIR__ . '/db.php';

try {
    $pdo = getDBConnection();
    
    echo "Updating database tables...\n\n";
    
    // 检查并添加 game_batches 表的 status 列
    $checkColumn = $pdo->query("SHOW COLUMNS FROM game_batches LIKE 'status'")->fetch();
    if (!$checkColumn) {
        echo "Adding 'status' column to game_batches table...\n";
        $pdo->exec("ALTER TABLE game_batches ADD COLUMN status ENUM('waiting', 'in_progress', 'completed') DEFAULT 'waiting'");
        echo "✓ Added status column\n";
    } else {
        echo "✓ status column already exists\n";
    }
    
    // 添加其他可能缺失的列
    $columnsToCheck = [
        'game_batches' => [
            'batch_number' => "ALTER TABLE game_batches ADD COLUMN batch_number INT NOT NULL AFTER table_id"
        ]
    ];
    
    foreach ($columnsToCheck as $table => $columns) {
        foreach ($columns as $column => $sql) {
            $check = $pdo->query("SHOW COLUMNS FROM $table LIKE '$column'")->fetch();
            if (!$check) {
                echo "Adding '$column' column to $table table...\n";
                $pdo->exec($sql);
                echo "✓ Added $column column\n";
            } else {
                echo "✓ $column column already exists\n";
            }
        }
    }
    
    // 初始化一些测试数据
    echo "\nInitializing test data...\n";
    
    // 检查是否有 game_batches 数据
    $batchCount = $pdo->query("SELECT COUNT(*) FROM game_batches")->fetchColumn();
    if ($batchCount == 0) {
        echo "Creating test game batches...\n";
        for ($i = 1; $i <= 6; $i++) {
            $stmt = $pdo->prepare("INSERT INTO game_batches (table_id, batch_number, status) VALUES (?, 1, 'waiting')");
            $stmt->execute([$i]);
        }
        echo "✓ Created test batches\n";
    }
    
    echo "\n✓ Database update completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>