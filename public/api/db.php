<?php
/**
 * Database Connection Handler
 * نظام إدارة مركز الصيانة
 */

class Database {
    private static $instance = null;
    private $pdo;
    private $prefix;
    
    private function __construct() {
        $configPath = __DIR__ . '/config.php';
        
        if (!file_exists($configPath)) {
            throw new Exception('النظام غير مُنصّب. الرجاء تشغيل ملف التنصيب أولاً.');
        }
        
        $config = include($configPath);
        
        if (!$config || !isset($config['installed']) || !$config['installed']) {
            throw new Exception('النظام غير مُنصّب بشكل صحيح.');
        }
        
        $db = $config['db'];
        $this->prefix = $db['prefix'];
        
        try {
            $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset={$db['charset']}";
            $this->pdo = new PDO($dsn, $db['user'], $db['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            throw new Exception('فشل الاتصال بقاعدة البيانات: ' . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
    
    public function getPrefix() {
        return $this->prefix;
    }
    
    public function table($name) {
        return $this->prefix . $name;
    }
    
    // Prevent cloning
    private function __clone() {}
    
    // Prevent unserialization
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Helper function to get database instance
function db() {
    return Database::getInstance()->getConnection();
}

function table($name) {
    return Database::getInstance()->table($name);
}

// UUID Generator
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// JSON Response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Error Response helper
function errorResponse($message, $status = 400) {
    jsonResponse(['success' => false, 'error' => $message], $status);
}

// Success Response helper
function successResponse($data = null, $message = 'تمت العملية بنجاح') {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response);
}

// Get JSON input
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

// CORS Headers
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
