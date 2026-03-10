<?php
/**
 * Transactions API
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
                getTransaction($id);
            } else {
                getTransactions();
            }
            break;
            
        case 'POST':
            createTransaction();
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('معرف المعاملة مطلوب');
            }
            updateTransaction($id);
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('معرف المعاملة مطلوب');
            }
            deleteTransaction($id);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getTransactions() {
    $type = $_GET['type'] ?? null;
    $category = $_GET['category'] ?? null;
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    
    $sql = "SELECT t.*, o.order_number 
            FROM " . table('transactions') . " t 
            LEFT JOIN " . table('orders') . " o ON t.order_id = o.id 
            WHERE 1=1";
    $params = [];
    
    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    
    if ($category) {
        $sql .= " AND t.category = ?";
        $params[] = $category;
    }
    
    if ($startDate) {
        $sql .= " AND t.transaction_date >= ?";
        $params[] = $startDate;
    }
    
    if ($endDate) {
        $sql .= " AND t.transaction_date <= ?";
        $params[] = $endDate;
    }
    
    $sql .= " ORDER BY t.transaction_date DESC, t.created_at DESC";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();
    
    successResponse($transactions);
}

function getTransaction($id) {
    $stmt = db()->prepare("SELECT t.*, o.order_number 
                           FROM " . table('transactions') . " t 
                           LEFT JOIN " . table('orders') . " o ON t.order_id = o.id 
                           WHERE t.id = ?");
    $stmt->execute([$id]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        errorResponse('المعاملة غير موجودة', 404);
    }
    
    successResponse($transaction);
}

function createTransaction() {
    $input = getJsonInput();
    
    $required = ['type', 'category', 'amount', 'transaction_date'];
    foreach ($required as $field) {
        if (empty($input[$field]) && $input[$field] !== 0) {
            errorResponse("الحقل $field مطلوب");
        }
    }
    
    if (!in_array($input['type'], ['income', 'expense'])) {
        errorResponse('نوع المعاملة غير صحيح');
    }
    
    $id = generateUUID();
    
    $stmt = db()->prepare("INSERT INTO " . table('transactions') . " 
        (id, type, category, amount, description, order_id, payment_method, created_by, transaction_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $input['type'],
        $input['category'],
        $input['amount'],
        $input['description'] ?? null,
        $input['order_id'] ?? null,
        $input['payment_method'] ?? 'cash',
        $_SESSION['user_id'],
        $input['transaction_date']
    ]);
    
    successResponse(['id' => $id], 'تم إضافة المعاملة بنجاح');
}

function updateTransaction($id) {
    $input = getJsonInput();
    
    // Check if transaction exists
    $stmt = db()->prepare("SELECT id FROM " . table('transactions') . " WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('المعاملة غير موجودة', 404);
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['type', 'category', 'amount', 'description', 'order_id', 
                      'payment_method', 'transaction_date'];
    
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
    $sql = "UPDATE " . table('transactions') . " SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    
    successResponse(null, 'تم تحديث المعاملة بنجاح');
}

function deleteTransaction($id) {
    $stmt = db()->prepare("DELETE FROM " . table('transactions') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف المعاملة بنجاح');
}
