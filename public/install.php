<?php
/**
 * نظام إدارة مركز الصيانة - ملف التنصيب
 * Maintenance Center Management System - Installation Wizard
 * Version: 2.0.0
 */

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Check if already installed
if (file_exists('api/config.php')) {
    $config = include('api/config.php');
    if ($config && isset($config['installed']) && $config['installed'] === true) {
        header('Location: index.html');
        exit;
    }
}

$step = isset($_GET['step']) ? (int)$_GET['step'] : 1;
$error = '';
$success = '';

// Process form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Step 2: Check requirements
    if ($step === 2) {
        header('Location: install.php?step=3');
        exit;
    }
    
    // Step 3: Database configuration
    if ($step === 3) {
        $db_host = trim($_POST['db_host'] ?? 'localhost');
        $db_name = trim($_POST['db_name'] ?? '');
        $db_user = trim($_POST['db_user'] ?? '');
        $db_pass = $_POST['db_pass'] ?? '';
        $db_prefix = trim($_POST['db_prefix'] ?? 'mcs_');
        
        // Test connection
        try {
            $pdo = new PDO(
                "mysql:host=$db_host;charset=utf8mb4",
                $db_user,
                $db_pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            
            // Create database if not exists
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `$db_name`");
            
            // Save to session for next step
            $_SESSION['db_config'] = [
                'host' => $db_host,
                'name' => $db_name,
                'user' => $db_user,
                'pass' => $db_pass,
                'prefix' => $db_prefix
            ];
            
            header('Location: install.php?step=4');
            exit;
            
        } catch (PDOException $e) {
            $error = 'فشل الاتصال بقاعدة البيانات: ' . $e->getMessage();
        }
    }
    
    // Step 4: Create tables
    if ($step === 4) {
        $db = $_SESSION['db_config'] ?? null;
        if (!$db) {
            header('Location: install.php?step=3');
            exit;
        }
        
        try {
            $pdo = new PDO(
                "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4",
                $db['user'],
                $db['pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            
            $prefix = $db['prefix'];
            
            // Create tables
            $sql = "
            -- Users table
            CREATE TABLE IF NOT EXISTS `{$prefix}users` (
                `id` VARCHAR(36) PRIMARY KEY,
                `username` VARCHAR(50) UNIQUE NOT NULL,
                `password` VARCHAR(255) NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `email` VARCHAR(100),
                `phone` VARCHAR(20),
                `role` ENUM('admin', 'manager', 'technician', 'receptionist') DEFAULT 'technician',
                `permissions` JSON,
                `is_active` BOOLEAN DEFAULT TRUE,
                `avatar` TEXT,
                `last_login` DATETIME,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Customers table
            CREATE TABLE IF NOT EXISTS `{$prefix}customers` (
                `id` VARCHAR(36) PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `phone` VARCHAR(20) NOT NULL,
                `email` VARCHAR(100),
                `address` TEXT,
                `notes` TEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_phone` (`phone`),
                INDEX `idx_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Service Orders table
            CREATE TABLE IF NOT EXISTS `{$prefix}orders` (
                `id` VARCHAR(36) PRIMARY KEY,
                `order_number` VARCHAR(50) UNIQUE NOT NULL,
                `customer_id` VARCHAR(36) NOT NULL,
                `device_type` VARCHAR(100) NOT NULL,
                `device_model` VARCHAR(100),
                `serial_number` VARCHAR(100),
                `problem_description` TEXT NOT NULL,
                `accessories` TEXT,
                `status` ENUM('pending', 'diagnosing', 'waiting_approval', 'waiting_parts', 'in_progress', 'completed', 'delivered', 'cancelled') DEFAULT 'pending',
                `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                `assigned_technician` VARCHAR(100),
                `estimated_cost` DECIMAL(10,2) DEFAULT 0,
                `final_cost` DECIMAL(10,2) DEFAULT 0,
                `paid_amount` DECIMAL(10,2) DEFAULT 0,
                `diagnosis_notes` TEXT,
                `internal_notes` TEXT,
                `warranty_period` INT DEFAULT 0,
                `received_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `estimated_completion` DATETIME,
                `completed_date` DATETIME,
                `delivered_date` DATETIME,
                `created_by` VARCHAR(36),
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_status` (`status`),
                INDEX `idx_customer` (`customer_id`),
                INDEX `idx_technician` (`assigned_technician`),
                INDEX `idx_order_number` (`order_number`),
                FOREIGN KEY (`customer_id`) REFERENCES `{$prefix}customers`(`id`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Maintenance Actions table
            CREATE TABLE IF NOT EXISTS `{$prefix}maintenance_actions` (
                `id` VARCHAR(36) PRIMARY KEY,
                `order_id` VARCHAR(36) NOT NULL,
                `action` TEXT NOT NULL,
                `technician` VARCHAR(100),
                `cost` DECIMAL(10,2) DEFAULT 0,
                `duration_minutes` INT DEFAULT 0,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_order` (`order_id`),
                FOREIGN KEY (`order_id`) REFERENCES `{$prefix}orders`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Spare Parts table
            CREATE TABLE IF NOT EXISTS `{$prefix}spare_parts` (
                `id` VARCHAR(36) PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `sku` VARCHAR(50) UNIQUE,
                `category` VARCHAR(50),
                `quantity` INT DEFAULT 0,
                `min_quantity` INT DEFAULT 5,
                `buy_price` DECIMAL(10,2) DEFAULT 0,
                `sell_price` DECIMAL(10,2) DEFAULT 0,
                `location` VARCHAR(100),
                `supplier` VARCHAR(100),
                `notes` TEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_sku` (`sku`),
                INDEX `idx_category` (`category`),
                INDEX `idx_quantity` (`quantity`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Used Parts in Orders
            CREATE TABLE IF NOT EXISTS `{$prefix}order_parts` (
                `id` VARCHAR(36) PRIMARY KEY,
                `order_id` VARCHAR(36) NOT NULL,
                `part_id` VARCHAR(36) NOT NULL,
                `quantity` INT DEFAULT 1,
                `unit_price` DECIMAL(10,2) DEFAULT 0,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_order` (`order_id`),
                INDEX `idx_part` (`part_id`),
                FOREIGN KEY (`order_id`) REFERENCES `{$prefix}orders`(`id`) ON DELETE CASCADE,
                FOREIGN KEY (`part_id`) REFERENCES `{$prefix}spare_parts`(`id`) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Payments table
            CREATE TABLE IF NOT EXISTS `{$prefix}payments` (
                `id` VARCHAR(36) PRIMARY KEY,
                `order_id` VARCHAR(36) NOT NULL,
                `amount` DECIMAL(10,2) NOT NULL,
                `payment_method` ENUM('cash', 'card', 'transfer', 'other') DEFAULT 'cash',
                `payment_type` ENUM('deposit', 'partial', 'final', 'refund') DEFAULT 'partial',
                `notes` TEXT,
                `received_by` VARCHAR(100),
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_order` (`order_id`),
                FOREIGN KEY (`order_id`) REFERENCES `{$prefix}orders`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Transactions table
            CREATE TABLE IF NOT EXISTS `{$prefix}transactions` (
                `id` VARCHAR(36) PRIMARY KEY,
                `type` ENUM('income', 'expense') NOT NULL,
                `category` VARCHAR(50) NOT NULL,
                `amount` DECIMAL(10,2) NOT NULL,
                `description` TEXT,
                `order_id` VARCHAR(36),
                `payment_method` ENUM('cash', 'card', 'transfer', 'other') DEFAULT 'cash',
                `created_by` VARCHAR(100),
                `transaction_date` DATE NOT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_type` (`type`),
                INDEX `idx_category` (`category`),
                INDEX `idx_date` (`transaction_date`),
                INDEX `idx_order` (`order_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Currencies table
            CREATE TABLE IF NOT EXISTS `{$prefix}currencies` (
                `id` VARCHAR(36) PRIMARY KEY,
                `code` VARCHAR(3) UNIQUE NOT NULL,
                `symbol` VARCHAR(10) NOT NULL,
                `name_ar` VARCHAR(50) NOT NULL,
                `name_en` VARCHAR(50) NOT NULL,
                `exchange_rate` DECIMAL(10,6) DEFAULT 1,
                `decimal_places` INT DEFAULT 2,
                `is_default` BOOLEAN DEFAULT FALSE,
                `is_active` BOOLEAN DEFAULT TRUE,
                `symbol_position` ENUM('before', 'after') DEFAULT 'after',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Settings table
            CREATE TABLE IF NOT EXISTS `{$prefix}settings` (
                `key` VARCHAR(100) PRIMARY KEY,
                `value` TEXT,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            -- Activity Log
            CREATE TABLE IF NOT EXISTS `{$prefix}activity_log` (
                `id` VARCHAR(36) PRIMARY KEY,
                `user_id` VARCHAR(36),
                `action` VARCHAR(100) NOT NULL,
                `entity_type` VARCHAR(50),
                `entity_id` VARCHAR(36),
                `details` JSON,
                `ip_address` VARCHAR(45),
                `user_agent` TEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_user` (`user_id`),
                INDEX `idx_action` (`action`),
                INDEX `idx_date` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            // Execute each statement
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            foreach ($statements as $statement) {
                if (!empty($statement)) {
                    $pdo->exec($statement);
                }
            }
            
            // Insert default currencies
            $currencies = [
                ['SAR', 'ر.س', 'ريال سعودي', 'Saudi Riyal', 1, 2, 1, 'after'],
                ['USD', '$', 'دولار أمريكي', 'US Dollar', 3.75, 2, 0, 'before'],
                ['EUR', '€', 'يورو', 'Euro', 4.10, 2, 0, 'before'],
                ['AED', 'د.إ', 'درهم إماراتي', 'UAE Dirham', 1.02, 2, 0, 'after'],
                ['KWD', 'د.ك', 'دينار كويتي', 'Kuwaiti Dinar', 12.20, 3, 0, 'after'],
                ['EGP', 'ج.م', 'جنيه مصري', 'Egyptian Pound', 0.12, 2, 0, 'after'],
            ];
            
            $stmt = $pdo->prepare("INSERT IGNORE INTO `{$prefix}currencies` 
                (`id`, `code`, `symbol`, `name_ar`, `name_en`, `exchange_rate`, `decimal_places`, `is_default`, `symbol_position`) 
                VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($currencies as $c) {
                $stmt->execute($c);
            }
            
            header('Location: install.php?step=5');
            exit;
            
        } catch (PDOException $e) {
            $error = 'خطأ في إنشاء الجداول: ' . $e->getMessage();
        }
    }
    
    // Step 5: Admin account
    if ($step === 5) {
        $db = $_SESSION['db_config'] ?? null;
        if (!$db) {
            header('Location: install.php?step=3');
            exit;
        }
        
        $admin_name = trim($_POST['admin_name'] ?? '');
        $admin_user = trim($_POST['admin_user'] ?? '');
        $admin_email = trim($_POST['admin_email'] ?? '');
        $admin_pass = $_POST['admin_pass'] ?? '';
        $admin_pass2 = $_POST['admin_pass2'] ?? '';
        
        if (empty($admin_name) || empty($admin_user) || empty($admin_pass)) {
            $error = 'جميع الحقول مطلوبة';
        } elseif ($admin_pass !== $admin_pass2) {
            $error = 'كلمتا المرور غير متطابقتين';
        } elseif (strlen($admin_pass) < 6) {
            $error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        } else {
            try {
                $pdo = new PDO(
                    "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4",
                    $db['user'],
                    $db['pass'],
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                
                $prefix = $db['prefix'];
                
                // Create admin user
                $stmt = $pdo->prepare("INSERT INTO `{$prefix}users` 
                    (`id`, `username`, `password`, `name`, `email`, `role`, `is_active`, `permissions`) 
                    VALUES (UUID(), ?, ?, ?, ?, 'admin', TRUE, ?)");
                
                $permissions = json_encode([
                    'dashboard' => true,
                    'reception' => true,
                    'maintenance' => true,
                    'spareParts' => true,
                    'financial' => true,
                    'customers' => true,
                    'settings' => true,
                    'users' => true
                ]);
                
                $stmt->execute([
                    $admin_user,
                    password_hash($admin_pass, PASSWORD_DEFAULT),
                    $admin_name,
                    $admin_email,
                    $permissions
                ]);
                
                $_SESSION['admin_created'] = true;
                
                header('Location: install.php?step=6');
                exit;
                
            } catch (PDOException $e) {
                $error = 'خطأ في إنشاء الحساب: ' . $e->getMessage();
            }
        }
    }
    
    // Step 6: Center settings
    if ($step === 6) {
        $db = $_SESSION['db_config'] ?? null;
        if (!$db) {
            header('Location: install.php?step=3');
            exit;
        }
        
        $center_name = trim($_POST['center_name'] ?? 'مركز الصيانة');
        $center_phone = trim($_POST['center_phone'] ?? '');
        $center_email = trim($_POST['center_email'] ?? '');
        $center_address = trim($_POST['center_address'] ?? '');
        
        try {
            $pdo = new PDO(
                "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4",
                $db['user'],
                $db['pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            
            $prefix = $db['prefix'];
            
            // Save settings
            $settings = [
                'center_name' => $center_name,
                'center_phone' => $center_phone,
                'center_email' => $center_email,
                'center_address' => $center_address,
                'default_currency' => 'SAR',
                'tax_enabled' => '0',
                'tax_rate' => '15',
                'warranty_days' => '30',
                'order_prefix' => 'ORD-'
            ];
            
            $stmt = $pdo->prepare("INSERT INTO `{$prefix}settings` (`key`, `value`) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
            
            foreach ($settings as $key => $value) {
                $stmt->execute([$key, $value]);
            }
            
            // Create config file
            $configContent = "<?php
return [
    'installed' => true,
    'version' => '2.0.0',
    'db' => [
        'host' => '{$db['host']}',
        'name' => '{$db['name']}',
        'user' => '{$db['user']}',
        'pass' => '{$db['pass']}',
        'prefix' => '{$db['prefix']}',
        'charset' => 'utf8mb4'
    ],
    'app' => [
        'name' => '$center_name',
        'debug' => false,
        'timezone' => 'Asia/Riyadh'
    ],
    'security' => [
        'jwt_secret' => '" . bin2hex(random_bytes(32)) . "',
        'session_lifetime' => 86400
    ]
];
";
            
            if (!is_dir('api')) {
                mkdir('api', 0755, true);
            }
            
            file_put_contents('api/config.php', $configContent);
            
            // Clear session
            unset($_SESSION['db_config']);
            unset($_SESSION['admin_created']);
            
            header('Location: install.php?step=7');
            exit;
            
        } catch (Exception $e) {
            $error = 'خطأ في حفظ الإعدادات: ' . $e->getMessage();
        }
    }
}

// Check requirements
function checkRequirements() {
    $requirements = [];
    
    $requirements['php_version'] = [
        'name' => 'إصدار PHP 7.4+',
        'status' => version_compare(PHP_VERSION, '7.4.0', '>='),
        'current' => PHP_VERSION
    ];
    
    $requirements['pdo'] = [
        'name' => 'PDO Extension',
        'status' => extension_loaded('pdo'),
        'current' => extension_loaded('pdo') ? 'مُثبت' : 'غير مثبت'
    ];
    
    $requirements['pdo_mysql'] = [
        'name' => 'PDO MySQL Driver',
        'status' => extension_loaded('pdo_mysql'),
        'current' => extension_loaded('pdo_mysql') ? 'مُثبت' : 'غير مثبت'
    ];
    
    $requirements['json'] = [
        'name' => 'JSON Extension',
        'status' => extension_loaded('json'),
        'current' => extension_loaded('json') ? 'مُثبت' : 'غير مثبت'
    ];
    
    $requirements['mbstring'] = [
        'name' => 'Mbstring Extension',
        'status' => extension_loaded('mbstring'),
        'current' => extension_loaded('mbstring') ? 'مُثبت' : 'غير مثبت'
    ];
    
    $requirements['writable'] = [
        'name' => 'صلاحية الكتابة (api/)',
        'status' => is_writable('.') || is_writable('api'),
        'current' => (is_writable('.') || is_writable('api')) ? 'متاح' : 'غير متاح'
    ];
    
    return $requirements;
}

$allPassed = true;
if ($step === 2) {
    $requirements = checkRequirements();
    foreach ($requirements as $req) {
        if (!$req['status']) {
            $allPassed = false;
            break;
        }
    }
}

?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تنصيب نظام إدارة مركز الصيانة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Tajawal', sans-serif;
            background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .installer {
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4);
            width: 100%;
            max-width: 700px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 1.8rem;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
        }
        
        .steps {
            display: flex;
            justify-content: center;
            padding: 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .step-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            background: #e2e8f0;
            color: #64748b;
        }
        
        .step-item.active {
            background: #3b82f6;
            color: white;
        }
        
        .step-item.completed {
            background: #22c55e;
            color: white;
        }
        
        .step-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.8rem;
        }
        
        .content {
            padding: 40px;
        }
        
        .content h2 {
            color: #1e293b;
            margin-bottom: 10px;
            font-size: 1.5rem;
        }
        
        .content p {
            color: #64748b;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .btn {
            padding: 14px 32px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
        }
        
        .btn-primary:disabled {
            background: #94a3b8;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .btn-success {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
        }
        
        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
        }
        
        .buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        
        .alert {
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
        }
        
        .alert-success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #16a34a;
        }
        
        .requirements {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
        }
        
        .req-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .req-item:last-child {
            border-bottom: none;
        }
        
        .req-status {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .req-status.pass {
            color: #22c55e;
        }
        
        .req-status.fail {
            color: #ef4444;
        }
        
        .icon {
            width: 20px;
            height: 20px;
        }
        
        .welcome-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
        }
        
        .feature-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .feature-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2rem;
        }
        
        .success-container {
            text-align: center;
            padding: 40px 0;
        }
        
        .success-icon {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            color: white;
            font-size: 3rem;
        }
        
        .credentials-box {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: right;
        }
        
        .credentials-box h4 {
            margin-bottom: 15px;
            color: #374151;
        }
        
        .credential-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .credential-item:last-child {
            border-bottom: none;
        }
        
        .credential-item span:last-child {
            font-family: monospace;
            background: #e2e8f0;
            padding: 4px 12px;
            border-radius: 6px;
        }
        
        @media (max-width: 640px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
            
            .steps {
                flex-direction: column;
                align-items: stretch;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="installer">
        <div class="header">
            <h1>🔧 نظام إدارة مركز الصيانة</h1>
            <p>معالج التنصيب - الإصدار 2.0.0</p>
        </div>
        
        <div class="steps">
            <div class="step-item <?php echo $step >= 1 ? ($step > 1 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">1</span>
                <span>الترحيب</span>
            </div>
            <div class="step-item <?php echo $step >= 2 ? ($step > 2 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">2</span>
                <span>المتطلبات</span>
            </div>
            <div class="step-item <?php echo $step >= 3 ? ($step > 3 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">3</span>
                <span>قاعدة البيانات</span>
            </div>
            <div class="step-item <?php echo $step >= 4 ? ($step > 4 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">4</span>
                <span>الجداول</span>
            </div>
            <div class="step-item <?php echo $step >= 5 ? ($step > 5 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">5</span>
                <span>المدير</span>
            </div>
            <div class="step-item <?php echo $step >= 6 ? ($step > 6 ? 'completed' : 'active') : ''; ?>">
                <span class="step-number">6</span>
                <span>الإعدادات</span>
            </div>
            <div class="step-item <?php echo $step >= 7 ? 'active' : ''; ?>">
                <span class="step-number">7</span>
                <span>انتهى</span>
            </div>
        </div>
        
        <div class="content">
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <?php if ($step === 1): ?>
                <!-- Step 1: Welcome -->
                <div style="text-align: center;">
                    <div class="welcome-icon">🔧</div>
                    <h2>مرحباً بك في معالج التنصيب</h2>
                    <p>سيساعدك هذا المعالج على تثبيت نظام إدارة مركز الصيانة على موقعك</p>
                    
                    <div class="feature-grid">
                        <div class="feature-item">
                            <div class="feature-icon">📦</div>
                            <div>
                                <strong>تسليم وتسلم</strong>
                                <small style="display: block; color: #64748b;">إدارة استلام الأجهزة</small>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🔧</div>
                            <div>
                                <strong>الصيانة</strong>
                                <small style="display: block; color: #64748b;">متابعة الإصلاحات</small>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">⚙️</div>
                            <div>
                                <strong>قطع الغيار</strong>
                                <small style="display: block; color: #64748b;">إدارة المخزون</small>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">💰</div>
                            <div>
                                <strong>المالية</strong>
                                <small style="display: block; color: #64748b;">الإيرادات والمصروفات</small>
                            </div>
                        </div>
                    </div>
                    
                    <a href="install.php?step=2" class="btn btn-primary">ابدأ التنصيب ←</a>
                </div>
                
            <?php elseif ($step === 2): ?>
                <!-- Step 2: Requirements -->
                <h2>فحص المتطلبات</h2>
                <p>يتم التحقق من متطلبات النظام...</p>
                
                <div class="requirements">
                    <?php foreach ($requirements as $key => $req): ?>
                        <div class="req-item">
                            <span><?php echo $req['name']; ?></span>
                            <div class="req-status <?php echo $req['status'] ? 'pass' : 'fail'; ?>">
                                <span><?php echo $req['current']; ?></span>
                                <?php if ($req['status']): ?>
                                    <span>✓</span>
                                <?php else: ?>
                                    <span>✗</span>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <form method="POST" class="buttons">
                    <a href="install.php?step=1" class="btn" style="background: #e2e8f0; color: #374151;">→ السابق</a>
                    <button type="submit" class="btn btn-primary" <?php echo !$allPassed ? 'disabled' : ''; ?>>
                        التالي ←
                    </button>
                </form>
                
            <?php elseif ($step === 3): ?>
                <!-- Step 3: Database -->
                <h2>إعداد قاعدة البيانات</h2>
                <p>أدخل بيانات الاتصال بقاعدة بيانات MySQL</p>
                
                <form method="POST">
                    <div class="form-row">
                        <div class="form-group">
                            <label>خادم قاعدة البيانات</label>
                            <input type="text" name="db_host" value="localhost" required>
                        </div>
                        <div class="form-group">
                            <label>اسم قاعدة البيانات</label>
                            <input type="text" name="db_name" placeholder="maintenance_db" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>اسم المستخدم</label>
                            <input type="text" name="db_user" placeholder="root" required>
                        </div>
                        <div class="form-group">
                            <label>كلمة المرور</label>
                            <input type="password" name="db_pass">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>بادئة الجداول</label>
                        <input type="text" name="db_prefix" value="mcs_" required>
                    </div>
                    
                    <div class="buttons">
                        <a href="install.php?step=2" class="btn" style="background: #e2e8f0; color: #374151;">→ السابق</a>
                        <button type="submit" class="btn btn-primary">اختبار الاتصال والمتابعة ←</button>
                    </div>
                </form>
                
            <?php elseif ($step === 4): ?>
                <!-- Step 4: Create Tables -->
                <h2>إنشاء الجداول</h2>
                <p>سيتم إنشاء جداول قاعدة البيانات...</p>
                
                <div class="requirements">
                    <div class="req-item">
                        <span>جدول المستخدمين (users)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول العملاء (customers)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول الأوامر (orders)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول قطع الغيار (spare_parts)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول المعاملات (transactions)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول الدفعات (payments)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول العملات (currencies)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                    <div class="req-item">
                        <span>جدول الإعدادات (settings)</span>
                        <span class="req-status pass">سيتم إنشاؤه</span>
                    </div>
                </div>
                
                <form method="POST" class="buttons">
                    <a href="install.php?step=3" class="btn" style="background: #e2e8f0; color: #374151;">→ السابق</a>
                    <button type="submit" class="btn btn-primary">إنشاء الجداول ←</button>
                </form>
                
            <?php elseif ($step === 5): ?>
                <!-- Step 5: Admin Account -->
                <h2>إنشاء حساب المدير</h2>
                <p>أنشئ حساب المدير الرئيسي للنظام</p>
                
                <form method="POST">
                    <div class="form-row">
                        <div class="form-group">
                            <label>الاسم الكامل</label>
                            <input type="text" name="admin_name" placeholder="أحمد محمد" required>
                        </div>
                        <div class="form-group">
                            <label>اسم المستخدم</label>
                            <input type="text" name="admin_user" placeholder="admin" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>البريد الإلكتروني</label>
                        <input type="email" name="admin_email" placeholder="admin@example.com">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>كلمة المرور</label>
                            <input type="password" name="admin_pass" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>تأكيد كلمة المرور</label>
                            <input type="password" name="admin_pass2" required minlength="6">
                        </div>
                    </div>
                    
                    <div class="buttons">
                        <a href="install.php?step=4" class="btn" style="background: #e2e8f0; color: #374151;">→ السابق</a>
                        <button type="submit" class="btn btn-primary">إنشاء الحساب ←</button>
                    </div>
                </form>
                
            <?php elseif ($step === 6): ?>
                <!-- Step 6: Center Settings -->
                <h2>إعدادات المركز</h2>
                <p>أدخل معلومات مركز الصيانة</p>
                
                <form method="POST">
                    <div class="form-group">
                        <label>اسم المركز</label>
                        <input type="text" name="center_name" value="مركز الصيانة المتقدم" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>رقم الهاتف</label>
                            <input type="tel" name="center_phone" placeholder="+966 50 000 0000">
                        </div>
                        <div class="form-group">
                            <label>البريد الإلكتروني</label>
                            <input type="email" name="center_email" placeholder="info@example.com">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>العنوان</label>
                        <input type="text" name="center_address" placeholder="الرياض، شارع الملك فهد">
                    </div>
                    
                    <div class="buttons">
                        <a href="install.php?step=5" class="btn" style="background: #e2e8f0; color: #374151;">→ السابق</a>
                        <button type="submit" class="btn btn-primary">حفظ وإنهاء التنصيب ←</button>
                    </div>
                </form>
                
            <?php elseif ($step === 7): ?>
                <!-- Step 7: Complete -->
                <div class="success-container">
                    <div class="success-icon">✓</div>
                    <h2>تم التنصيب بنجاح! 🎉</h2>
                    <p>تم تثبيت نظام إدارة مركز الصيانة بنجاح على موقعك</p>
                    
                    <div class="credentials-box">
                        <h4>🔐 بيانات تسجيل الدخول</h4>
                        <div class="credential-item">
                            <span>رابط النظام:</span>
                            <span><?php echo dirname($_SERVER['REQUEST_URI']); ?>/index.html</span>
                        </div>
                        <div class="credential-item">
                            <span>اسم المستخدم:</span>
                            <span>الذي أدخلته</span>
                        </div>
                        <div class="credential-item">
                            <span>كلمة المرور:</span>
                            <span>التي أدخلتها</span>
                        </div>
                    </div>
                    
                    <div class="alert alert-error" style="text-align: right; margin-top: 20px;">
                        <strong>⚠️ تنبيه أمني:</strong> 
                        يُنصح بحذف ملف <code>install.php</code> بعد التنصيب لحماية موقعك.
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <a href="index.html" class="btn btn-success">دخول إلى النظام ←</a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
