<?php
/**
 * Spare Parts API
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
                getPart($id);
            } else {
                getParts();
            }
            break;
            
        case 'POST':
            if ($action === 'use') {
                usePart();
            } else {
                createPart();
            }
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('معرف القطعة مطلوب');
            }
            updatePart($id);
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('معرف القطعة مطلوب');
            }
            deletePart($id);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getParts() {
    $category = $_GET['category'] ?? null;
    $lowStock = $_GET['low_stock'] ?? null;
    $search = $_GET['search'] ?? null;
    
    $sql = "SELECT * FROM " . table('spare_parts') . " WHERE 1=1";
    $params = [];
    
    if ($category) {
        $sql .= " AND category = ?";
        $params[] = $category;
    }
    
    if ($lowStock) {
        $sql .= " AND quantity <= min_quantity";
    }
    
    if ($search) {
        $sql .= " AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)";
        $searchTerm = "%$search%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }
    
    $sql .= " ORDER BY name ASC";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $parts = $stmt->fetchAll();
    
    successResponse($parts);
}

function getPart($id) {
    $stmt = db()->prepare("SELECT * FROM " . table('spare_parts') . " WHERE id = ?");
    $stmt->execute([$id]);
    $part = $stmt->fetch();
    
    if (!$part) {
        errorResponse('القطعة غير موجودة', 404);
    }
    
    // Get usage history
    $stmt = db()->prepare("SELECT op.*, o.order_number 
                           FROM " . table('order_parts') . " op 
                           LEFT JOIN " . table('orders') . " o ON op.order_id = o.id 
                           WHERE op.part_id = ? 
                           ORDER BY op.created_at DESC LIMIT 20");
    $stmt->execute([$id]);
    $part['usage_history'] = $stmt->fetchAll();
    
    successResponse($part);
}

function createPart() {
    $input = getJsonInput();
    
    if (empty($input['name'])) {
        errorResponse('اسم القطعة مطلوب');
    }
    
    // Check if SKU exists
    if (!empty($input['sku'])) {
        $stmt = db()->prepare("SELECT id FROM " . table('spare_parts') . " WHERE sku = ?");
        $stmt->execute([$input['sku']]);
        if ($stmt->fetch()) {
            errorResponse('رقم القطعة (SKU) موجود مسبقاً');
        }
    }
    
    $id = generateUUID();
    
    $stmt = db()->prepare("INSERT INTO " . table('spare_parts') . " 
        (id, name, sku, category, quantity, min_quantity, buy_price, sell_price, location, supplier, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $input['name'],
        $input['sku'] ?? null,
        $input['category'] ?? null,
        $input['quantity'] ?? 0,
        $input['min_quantity'] ?? 5,
        $input['buy_price'] ?? 0,
        $input['sell_price'] ?? 0,
        $input['location'] ?? null,
        $input['supplier'] ?? null,
        $input['notes'] ?? null
    ]);
    
    successResponse(['id' => $id], 'تم إضافة القطعة بنجاح');
}

function updatePart($id) {
    $input = getJsonInput();
    
    // Check if part exists
    $stmt = db()->prepare("SELECT id FROM " . table('spare_parts') . " WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('القطعة غير موجودة', 404);
    }
    
    // Check SKU uniqueness
    if (!empty($input['sku'])) {
        $stmt = db()->prepare("SELECT id FROM " . table('spare_parts') . " WHERE sku = ? AND id != ?");
        $stmt->execute([$input['sku'], $id]);
        if ($stmt->fetch()) {
            errorResponse('رقم القطعة (SKU) موجود مسبقاً');
        }
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['name', 'sku', 'category', 'quantity', 'min_quantity', 
                      'buy_price', 'sell_price', 'location', 'supplier', 'notes'];
    
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
    $sql = "UPDATE " . table('spare_parts') . " SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    
    successResponse(null, 'تم تحديث القطعة بنجاح');
}

function deletePart($id) {
    // Check if part is used in orders
    $stmt = db()->prepare("SELECT COUNT(*) FROM " . table('order_parts') . " WHERE part_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() > 0) {
        errorResponse('لا يمكن حذف قطعة مستخدمة في أوامر صيانة');
    }
    
    $stmt = db()->prepare("DELETE FROM " . table('spare_parts') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف القطعة بنجاح');
}

function usePart() {
    $input = getJsonInput();
    
    if (empty($input['order_id']) || empty($input['part_id']) || empty($input['quantity'])) {
        errorResponse('جميع الحقول مطلوبة');
    }
    
    // Check part availability
    $stmt = db()->prepare("SELECT quantity, sell_price FROM " . table('spare_parts') . " WHERE id = ?");
    $stmt->execute([$input['part_id']]);
    $part = $stmt->fetch();
    
    if (!$part) {
        errorResponse('القطعة غير موجودة');
    }
    
    if ($part['quantity'] < $input['quantity']) {
        errorResponse('الكمية المطلوبة غير متوفرة');
    }
    
    db()->beginTransaction();
    
    try {
        $id = generateUUID();
        $unitPrice = $input['unit_price'] ?? $part['sell_price'];
        
        // Add to order parts
        $stmt = db()->prepare("INSERT INTO " . table('order_parts') . " 
            (id, order_id, part_id, quantity, unit_price) 
            VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$id, $input['order_id'], $input['part_id'], $input['quantity'], $unitPrice]);
        
        // Decrease stock
        $stmt = db()->prepare("UPDATE " . table('spare_parts') . " 
            SET quantity = quantity - ? WHERE id = ?");
        $stmt->execute([$input['quantity'], $input['part_id']]);
        
        // Update order cost
        $totalCost = $unitPrice * $input['quantity'];
        $stmt = db()->prepare("UPDATE " . table('orders') . " 
            SET final_cost = final_cost + ? WHERE id = ?");
        $stmt->execute([$totalCost, $input['order_id']]);
        
        db()->commit();
        
        successResponse(['id' => $id], 'تم استخدام القطعة بنجاح');
        
    } catch (Exception $e) {
        db()->rollBack();
        throw $e;
    }
}
