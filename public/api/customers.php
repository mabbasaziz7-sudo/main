<?php
/**
 * Customers API
 * نظام إدارة مركز الصيانة
 */

require_once __DIR__ . '/db.php';
setCorsHeaders();

session_start();

if (!isset($_SESSION['user_id'])) {
    errorResponse('غير مصرح', 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getCustomer($id);
            } else {
                getCustomers();
            }
            break;
            
        case 'POST':
            createCustomer();
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('معرف العميل مطلوب');
            }
            updateCustomer($id);
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('معرف العميل مطلوب');
            }
            deleteCustomer($id);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getCustomers() {
    $search = $_GET['search'] ?? null;
    
    $sql = "SELECT c.*, 
            (SELECT COUNT(*) FROM " . table('orders') . " WHERE customer_id = c.id) as orders_count,
            (SELECT SUM(final_cost) FROM " . table('orders') . " WHERE customer_id = c.id) as total_spent
            FROM " . table('customers') . " c WHERE 1=1";
    $params = [];
    
    if ($search) {
        $sql .= " AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)";
        $searchTerm = "%$search%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }
    
    $sql .= " ORDER BY c.created_at DESC";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $customers = $stmt->fetchAll();
    
    successResponse($customers);
}

function getCustomer($id) {
    $stmt = db()->prepare("SELECT c.*, 
            (SELECT COUNT(*) FROM " . table('orders') . " WHERE customer_id = c.id) as orders_count,
            (SELECT SUM(final_cost) FROM " . table('orders') . " WHERE customer_id = c.id) as total_spent
            FROM " . table('customers') . " c WHERE c.id = ?");
    $stmt->execute([$id]);
    $customer = $stmt->fetch();
    
    if (!$customer) {
        errorResponse('العميل غير موجود', 404);
    }
    
    // Get customer orders
    $stmt = db()->prepare("SELECT * FROM " . table('orders') . " WHERE customer_id = ? ORDER BY created_at DESC");
    $stmt->execute([$id]);
    $customer['orders'] = $stmt->fetchAll();
    
    successResponse($customer);
}

function createCustomer() {
    $input = getJsonInput();
    
    if (empty($input['name']) || empty($input['phone'])) {
        errorResponse('الاسم ورقم الهاتف مطلوبان');
    }
    
    // Check if phone exists
    $stmt = db()->prepare("SELECT id FROM " . table('customers') . " WHERE phone = ?");
    $stmt->execute([$input['phone']]);
    if ($stmt->fetch()) {
        errorResponse('رقم الهاتف مسجل مسبقاً');
    }
    
    $id = generateUUID();
    
    $stmt = db()->prepare("INSERT INTO " . table('customers') . " 
        (id, name, phone, email, address, notes) 
        VALUES (?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $input['name'],
        $input['phone'],
        $input['email'] ?? null,
        $input['address'] ?? null,
        $input['notes'] ?? null
    ]);
    
    successResponse(['id' => $id], 'تم إنشاء العميل بنجاح');
}

function updateCustomer($id) {
    $input = getJsonInput();
    
    // Check if customer exists
    $stmt = db()->prepare("SELECT id FROM " . table('customers') . " WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('العميل غير موجود', 404);
    }
    
    // Check phone uniqueness
    if (!empty($input['phone'])) {
        $stmt = db()->prepare("SELECT id FROM " . table('customers') . " WHERE phone = ? AND id != ?");
        $stmt->execute([$input['phone'], $id]);
        if ($stmt->fetch()) {
            errorResponse('رقم الهاتف مسجل لعميل آخر');
        }
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['name', 'phone', 'email', 'address', 'notes'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = ?";
            $values[] = $input[$field];
        }
    }
    
    if (empty($fields)) {
        errorResponse('لا توجد بيانات للتحديث');
    }
    
    $values[] = $id;
    $sql = "UPDATE " . table('customers') . " SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    
    successResponse(null, 'تم تحديث العميل بنجاح');
}

function deleteCustomer($id) {
    // Check if customer has orders
    $stmt = db()->prepare("SELECT COUNT(*) FROM " . table('orders') . " WHERE customer_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() > 0) {
        errorResponse('لا يمكن حذف عميل لديه أوامر صيانة');
    }
    
    $stmt = db()->prepare("DELETE FROM " . table('customers') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف العميل بنجاح');
}
