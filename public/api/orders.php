<?php
/**
 * Orders API
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
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getOrder($id);
            } else {
                getOrders();
            }
            break;
            
        case 'POST':
            if ($action === 'payment') {
                addPayment();
            } elseif ($action === 'action') {
                addMaintenanceAction();
            } else {
                createOrder();
            }
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('معرف الأمر مطلوب');
            }
            updateOrder($id);
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('معرف الأمر مطلوب');
            }
            deleteOrder($id);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getOrders() {
    $status = $_GET['status'] ?? null;
    $customerId = $_GET['customer_id'] ?? null;
    $search = $_GET['search'] ?? null;
    
    $sql = "SELECT o.*, c.name as customer_name, c.phone as customer_phone 
            FROM " . table('orders') . " o 
            LEFT JOIN " . table('customers') . " c ON o.customer_id = c.id 
            WHERE 1=1";
    $params = [];
    
    if ($status) {
        $sql .= " AND o.status = ?";
        $params[] = $status;
    }
    
    if ($customerId) {
        $sql .= " AND o.customer_id = ?";
        $params[] = $customerId;
    }
    
    if ($search) {
        $sql .= " AND (o.order_number LIKE ? OR o.device_type LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)";
        $searchTerm = "%$search%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    $sql .= " ORDER BY o.created_at DESC";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();
    
    // Get maintenance actions and payments for each order
    foreach ($orders as &$order) {
        $order['maintenanceActions'] = getOrderActions($order['id']);
        $order['payments'] = getOrderPayments($order['id']);
        $order['usedParts'] = getOrderParts($order['id']);
    }
    
    successResponse($orders);
}

function getOrder($id) {
    $stmt = db()->prepare("SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email 
                           FROM " . table('orders') . " o 
                           LEFT JOIN " . table('customers') . " c ON o.customer_id = c.id 
                           WHERE o.id = ?");
    $stmt->execute([$id]);
    $order = $stmt->fetch();
    
    if (!$order) {
        errorResponse('الأمر غير موجود', 404);
    }
    
    $order['maintenanceActions'] = getOrderActions($id);
    $order['payments'] = getOrderPayments($id);
    $order['usedParts'] = getOrderParts($id);
    
    successResponse($order);
}

function getOrderActions($orderId) {
    $stmt = db()->prepare("SELECT * FROM " . table('maintenance_actions') . " WHERE order_id = ? ORDER BY created_at ASC");
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function getOrderPayments($orderId) {
    $stmt = db()->prepare("SELECT * FROM " . table('payments') . " WHERE order_id = ? ORDER BY created_at ASC");
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function getOrderParts($orderId) {
    $stmt = db()->prepare("SELECT op.*, sp.name as part_name, sp.sku 
                           FROM " . table('order_parts') . " op 
                           LEFT JOIN " . table('spare_parts') . " sp ON op.part_id = sp.id 
                           WHERE op.order_id = ?");
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function createOrder() {
    $input = getJsonInput();
    
    $required = ['customer_id', 'device_type', 'problem_description'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            errorResponse("الحقل $field مطلوب");
        }
    }
    
    $id = generateUUID();
    
    // Generate order number
    $stmt = db()->query("SELECT value FROM " . table('settings') . " WHERE `key` = 'order_prefix'");
    $prefix = $stmt->fetchColumn() ?: 'ORD-';
    
    $stmt = db()->query("SELECT COUNT(*) + 1 as num FROM " . table('orders'));
    $num = $stmt->fetchColumn();
    $orderNumber = $prefix . str_pad($num, 6, '0', STR_PAD_LEFT);
    
    $stmt = db()->prepare("INSERT INTO " . table('orders') . " 
        (id, order_number, customer_id, device_type, device_model, serial_number, 
         problem_description, accessories, status, priority, assigned_technician, 
         estimated_cost, diagnosis_notes, internal_notes, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $orderNumber,
        $input['customer_id'],
        $input['device_type'],
        $input['device_model'] ?? null,
        $input['serial_number'] ?? null,
        $input['problem_description'],
        $input['accessories'] ?? null,
        $input['status'] ?? 'pending',
        $input['priority'] ?? 'medium',
        $input['assigned_technician'] ?? null,
        $input['estimated_cost'] ?? 0,
        $input['diagnosis_notes'] ?? null,
        $input['internal_notes'] ?? null,
        $_SESSION['user_id']
    ]);
    
    successResponse(['id' => $id, 'order_number' => $orderNumber], 'تم إنشاء الأمر بنجاح');
}

function updateOrder($id) {
    $input = getJsonInput();
    
    // Check if order exists
    $stmt = db()->prepare("SELECT id FROM " . table('orders') . " WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('الأمر غير موجود', 404);
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = [
        'device_type', 'device_model', 'serial_number', 'problem_description',
        'accessories', 'status', 'priority', 'assigned_technician', 'estimated_cost',
        'final_cost', 'paid_amount', 'diagnosis_notes', 'internal_notes',
        'warranty_period', 'estimated_completion', 'completed_date', 'delivered_date'
    ];
    
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
    $sql = "UPDATE " . table('orders') . " SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    
    successResponse(null, 'تم تحديث الأمر بنجاح');
}

function deleteOrder($id) {
    $stmt = db()->prepare("DELETE FROM " . table('orders') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف الأمر بنجاح');
}

function addPayment() {
    $input = getJsonInput();
    
    if (empty($input['order_id']) || empty($input['amount'])) {
        errorResponse('معرف الأمر والمبلغ مطلوبان');
    }
    
    $id = generateUUID();
    
    db()->beginTransaction();
    
    try {
        // Add payment
        $stmt = db()->prepare("INSERT INTO " . table('payments') . " 
            (id, order_id, amount, payment_method, payment_type, notes, received_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $id,
            $input['order_id'],
            $input['amount'],
            $input['payment_method'] ?? 'cash',
            $input['payment_type'] ?? 'partial',
            $input['notes'] ?? null,
            $input['received_by'] ?? null
        ]);
        
        // Update order paid amount
        $stmt = db()->prepare("UPDATE " . table('orders') . " 
            SET paid_amount = paid_amount + ? WHERE id = ?");
        $stmt->execute([$input['amount'], $input['order_id']]);
        
        // Add to transactions
        $stmt = db()->prepare("INSERT INTO " . table('transactions') . " 
            (id, type, category, amount, description, order_id, payment_method, created_by, transaction_date) 
            VALUES (?, 'income', 'صيانة', ?, ?, ?, ?, ?, CURDATE())");
        
        $stmt->execute([
            generateUUID(),
            $input['amount'],
            'دفعة للأمر ' . $input['order_id'],
            $input['order_id'],
            $input['payment_method'] ?? 'cash',
            $_SESSION['user_id']
        ]);
        
        db()->commit();
        
        successResponse(['id' => $id], 'تم إضافة الدفعة بنجاح');
        
    } catch (Exception $e) {
        db()->rollBack();
        throw $e;
    }
}

function addMaintenanceAction() {
    $input = getJsonInput();
    
    if (empty($input['order_id']) || empty($input['action'])) {
        errorResponse('معرف الأمر والإجراء مطلوبان');
    }
    
    $id = generateUUID();
    
    $stmt = db()->prepare("INSERT INTO " . table('maintenance_actions') . " 
        (id, order_id, action, technician, cost, duration_minutes) 
        VALUES (?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $input['order_id'],
        $input['action'],
        $input['technician'] ?? null,
        $input['cost'] ?? 0,
        $input['duration_minutes'] ?? 0
    ]);
    
    successResponse(['id' => $id], 'تم إضافة الإجراء بنجاح');
}
