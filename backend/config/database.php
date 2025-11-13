<?php
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        // 从环境变量或直接设置获取数据库配置
        // serv00 通常使用 localhost 作为数据库主机
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->db_name = getenv('DB_NAME') ?: 'wenge9529_thirteenwater';
        $this->username = getenv('DB_USERNAME') ?: 'wenge9529';
        $this->password = getenv('DB_PASSWORD') ?: '';
        
        // 如果没有设置环境变量，尝试从 .env 文件读取
        if (empty($this->password)) {
            $this->loadEnvFile();
        }
    }
    
    private function loadEnvFile() {
        $env_file = __DIR__ . '/../.env';
        if (file_exists($env_file)) {
            $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue; // 跳过注释
                
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                switch ($key) {
                    case 'DB_HOST':
                        $this->host = $value;
                        break;
                    case 'DB_NAME':
                        $this->db_name = $value;
                        break;
                    case 'DB_USERNAME':
                        $this->username = $value;
                        break;
                    case 'DB_PASSWORD':
                        $this->password = $value;
                        break;
                }
            }
        }
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
        } catch(PDOException $exception) {
            // 不要直接输出错误信息到响应中
            error_log("Database connection error: " . $exception->getMessage());
            return null;
        }
        
        return $this->conn;
    }
}
?>