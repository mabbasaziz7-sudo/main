<?php
/**
 * Settings API
 * نظام إدارة مركز الصيانة
 */

require_once __DIR__ . '/db.php';
setCorsHeaders();

session_start();

if (!isset($_SESSION['user_id'])) {
    errorResponse('غير مصرح', 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($action === 'currencies') {
                getCurrencies();
            } elseif ($action === 'stats') {
                getStats();
            } else {
                getSettings();
            }
            break;
            
        case 'POST':
            if ($action === 'currencies') {
                saveCurrency();
            } elseif ($action === 'backup') {
                createBackup();
            } elseif ($action === 'restore') {
                restoreBackup();
            } else {
                saveSettings();
            }
            break;
            
        case 'DELETE':
            if ($action === 'currency') {
                deleteCurrency();
            }
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getSettings() {
    $stmt = db()->query("SELECT `key`, `value` FROM " . table('settings'));
    $rows = $stmt->fetchAll();
    
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['key']] = $row['value'];
    }
    
    successResponse($settings);
}

function saveSettings() {
    $input = getJsonInput();
    
    if (empty($input)) {
        errorResponse('لا توجد إعدادات للحفظ');
    }
    
    $stmt = db()->prepare("INSERT INTO " . table('settings') . " (`key`, `value`) VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
    
    foreach ($input as $key => $value) {
        $stmt->execute([$key, $value]);
    }
    
    successResponse(null, 'تم حفظ الإعدادات بنجاح');
}

function getCurrencies() {
    $stmt = db()->query("SELECT * FROM " . table('currencies') . " WHERE is_active = TRUE ORDER BY is_default DESC, name_ar ASC");
    $currencies = $stmt->fetchAll();
    
    foreach ($currencies as &$currency) {
        $currency['is_default'] = (bool)$currency['is_default'];
        $currency['is_active'] = (bool)$currency['is_active'];
        $currency['exchange_rate'] = (float)$currency['exchange_rate'];
        $currency['decimal_places'] = (int)$currency['decimal_places'];
    }
    
    successResponse($currencies);
}

function saveCurrency() {
    $input = getJsonInput();
    
    if (empty($input['code']) || empty($input['symbol']) || empty($input['name_ar'])) {
        errorResponse('كود العملة والرمز والاسم مطلوبون');
    }
    
    $id = $input['id'] ?? null;
    
    if ($id) {
        // Update existing
        $stmt = db()->prepare("UPDATE " . table('currencies') . " SET 
            code = ?, symbol = ?, name_ar = ?, name_en = ?, exchange_rate = ?, 
            decimal_places = ?, symbol_position = ?, is_default = ?, is_active = ? 
            WHERE id = ?");
        
        // If setting as default, unset others first
        if ($input['is_default'] ?? false) {
            db()->exec("UPDATE " . table('currencies') . " SET is_default = FALSE");
        }
        
        $stmt->execute([
            $input['code'],
            $input['symbol'],
            $input['name_ar'],
            $input['name_en'] ?? '',
            $input['exchange_rate'] ?? 1,
            $input['decimal_places'] ?? 2,
            $input['symbol_position'] ?? 'after',
            $input['is_default'] ?? false,
            $input['is_active'] ?? true,
            $id
        ]);
        
        successResponse(['id' => $id], 'تم تحديث العملة بنجاح');
    } else {
        // Create new
        $id = generateUUID();
        
        // Check if code exists
        $stmt = db()->prepare("SELECT id FROM " . table('currencies') . " WHERE code = ?");
        $stmt->execute([$input['code']]);
        if ($stmt->fetch()) {
            errorResponse('كود العملة موجود مسبقاً');
        }
        
        // If setting as default, unset others first
        if ($input['is_default'] ?? false) {
            db()->exec("UPDATE " . table('currencies') . " SET is_default = FALSE");
        }
        
        $stmt = db()->prepare("INSERT INTO " . table('currencies') . " 
            (id, code, symbol, name_ar, name_en, exchange_rate, decimal_places, symbol_position, is_default, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $id,
            $input['code'],
            $input['symbol'],
            $input['name_ar'],
            $input['name_en'] ?? '',
            $input['exchange_rate'] ?? 1,
            $input['decimal_places'] ?? 2,
            $input['symbol_position'] ?? 'after',
            $input['is_default'] ?? false,
            $input['is_active'] ?? true
        ]);
        
        successResponse(['id' => $id], 'تم إضافة العملة بنجاح');
    }
}

function deleteCurrency() {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        errorResponse('معرف العملة مطلوب');
    }
    
    // Check if default
    $stmt = db()->prepare("SELECT is_default FROM " . table('currencies') . " WHERE id = ?");
    $stmt->execute([$id]);
    $currency = $stmt->fetch();
    
    if ($currency && $currency['is_default']) {
        errorResponse('لا يمكن حذف العملة الافتراضية');
    }
    
    $stmt = db()->prepare("DELETE FROM " . table('currencies') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف العملة بنجاح');
}

function getStats() {
    $stats = [];
    
    // Orders stats
    $stmt = db()->query("SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered
        FROM " . table('orders'));
    $stats['orders'] = $stmt->fetch();
    
    // Customers count
    $stmt = db()->query("SELECT COUNT(*) as count FROM " . table('customers'));
    $stats['customers'] = $stmt->fetch()['count'];
    
    // Spare parts stats
    $stmt = db()->query("SELECT 
        COUNT(*) as total,
        SUM(quantity) as total_quantity,
        SUM(quantity * buy_price) as total_value,
        SUM(CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END) as low_stock
        FROM " . table('spare_parts'));
    $stats['spareParts'] = $stmt->fetch();
    
    // Financial stats
    $stmt = db()->query("SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
        FROM " . table('transactions'));
    $financial = $stmt->fetch();
    $stats['financial'] = [
        'income' => (float)($financial['income'] ?? 0),
        'expenses' => (float)($financial['expenses'] ?? 0),
        'profit' => (float)($financial['income'] ?? 0) - (float)($financial['expenses'] ?? 0)
    ];
    
    // Users count
    $stmt = db()->query("SELECT COUNT(*) as count FROM " . table('users') . " WHERE is_active = TRUE");
    $stats['users'] = $stmt->fetch()['count'];
    
    successResponse($stats);
}

function createBackup() {
    $backup = [
        'version' => '2.0.0',
        'date' => date('Y-m-d H:i:s'),
        'data' => []
    ];
    
    $tables = ['settings', 'currencies', 'users', 'customers', 'orders', 
               'maintenance_actions', 'spare_parts', 'order_parts', 'payments', 'transactions'];
    
    foreach ($tables as $tableName) {
        $stmt = db()->query("SELECT * FROM " . table($tableName));
        $backup['data'][$tableName] = $stmt->fetchAll();
    }
    
    successResponse($backup);
}

function restoreBackup() {
    $input = getJsonInput();
    
    if (empty($input['data'])) {
        errorResponse('بيانات النسخة الاحتياطية غير صالحة');
    }
    
    db()->beginTransaction();
    
    try {
        // Disable foreign key checks
        db()->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        // Clear and restore each table
        $tables = ['settings', 'currencies', 'users', 'customers', 'orders', 
                   'maintenance_actions', 'spare_parts', 'order_parts', 'payments', 'transactions'];
        
        foreach ($tables as $tableName) {
            if (isset($input['data'][$tableName])) {
                // Clear table
                db()->exec("TRUNCATE TABLE " . table($tableName));
                
                // Insert data
                $rows = $input['data'][$tableName];
                if (!empty($rows)) {
                    $columns = array_keys($rows[0]);
                    $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
                    $sql = "INSERT INTO " . table($tableName) . " (`" . implode('`, `', $columns) . "`) VALUES $placeholders";
                    
                    $stmt = db()->prepare($sql);
                    foreach ($rows as $row) {
                        $stmt->execute(array_values($row));
                    }
                }
            }
        }
        
        // Re-enable foreign key checks
        db()->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        db()->commit();
        
        successResponse(null, 'تمت استعادة النسخة الاحتياطية بنجاح');
        
    } catch (Exception $e) {
        db()->rollBack();
        db()->exec("SET FOREIGN_KEY_CHECKS = 1");
        throw $e;
    }
}
