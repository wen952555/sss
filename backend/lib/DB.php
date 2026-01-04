<?php
/* backend/lib/DB.php */
class DB {
    private static $pdo = null;

    public static function connect() {
        if (self::$pdo === null) {
            $envPath = dirname(__DIR__) . '/.env';
            if (!file_exists($envPath)) {
                 die(json_encode(['error' => '环境配置文件 .env 缺失']));
            }
            $env = parse_ini_file($envPath);
            try {
                $dsn = "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4";
                self::$pdo = new PDO($dsn, $env['DB_USER'], $env['DB_PASS']);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                header('Content-Type: application/json');
                die(json_encode(['error' => '数据库连接失败: ' . $e->getMessage()]));
            }
        }
        return self::$pdo;
    }
}
