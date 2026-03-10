<?php
/**
 * Users API
 * نظام إدارة مركز الصيانة
 */

require_once __DIR__ . '/db.php';
setCorsHeaders();

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    errorResponse('غير مصرح', 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getUser($id);
            } else {
                getUsers();
            }
            break;
            
        case 'POST':
            createUser();
            break;
            
        case 'PUT':
            if (!$id) {
                errorResponse('معرف المستخدم مطلوب');
            }
            updateUser($id);
            break;
            
        case 'DELETE':
            if (!$id) {
                errorResponse('معرف المستخدم مطلوب');
            }
            deleteUser($id);
            break;
            
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function getUsers() {
    $stmt = db()->query("SELECT id, username, name, email, phone, role, permissions, is_active, avatar, last_login, created_at FROM " . table('users') . " ORDER BY created_at DESC");
    $users = $stmt->fetchAll();
    
    foreach ($users as &$user) {
        $user['permissions'] = json_decode($user['permissions'], true);
        $user['is_active'] = (bool)$user['is_active'];
    }
    
    successResponse($users);
}

function getUser($id) {
    $stmt = db()->prepare("SELECT id, username, name, email, phone, role, permissions, is_active, avatar, last_login, created_at FROM " . table('users') . " WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        errorResponse('المستخدم غير موجود', 404);
    }
    
    $user['permissions'] = json_decode($user['permissions'], true);
    $user['is_active'] = (bool)$user['is_active'];
    
    successResponse($user);
}

function createUser() {
    $input = getJsonInput();
    
    $required = ['username', 'password', 'name', 'role'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            errorResponse("الحقل $field مطلوب");
        }
    }
    
    // Check if username exists
    $stmt = db()->prepare("SELECT id FROM " . table('users') . " WHERE username = ?");
    $stmt->execute([$input['username']]);
    if ($stmt->fetch()) {
        errorResponse('اسم المستخدم موجود مسبقاً');
    }
    
    $id = generateUUID();
    $permissions = $input['permissions'] ?? getDefaultPermissions($input['role']);
    
    $stmt = db()->prepare("INSERT INTO " . table('users') . " 
        (id, username, password, name, email, phone, role, permissions, is_active, avatar) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $id,
        $input['username'],
        password_hash($input['password'], PASSWORD_DEFAULT),
        $input['name'],
        $input['email'] ?? null,
        $input['phone'] ?? null,
        $input['role'],
        json_encode($permissions),
        $input['is_active'] ?? true,
        $input['avatar'] ?? null
    ]);
    
    successResponse(['id' => $id], 'تم إنشاء المستخدم بنجاح');
}

function updateUser($id) {
    $input = getJsonInput();
    
    // Check if user exists
    $stmt = db()->prepare("SELECT id FROM " . table('users') . " WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        errorResponse('المستخدم غير موجود', 404);
    }
    
    // Check username uniqueness if changing
    if (!empty($input['username'])) {
        $stmt = db()->prepare("SELECT id FROM " . table('users') . " WHERE username = ? AND id != ?");
        $stmt->execute([$input['username'], $id]);
        if ($stmt->fetch()) {
            errorResponse('اسم المستخدم موجود مسبقاً');
        }
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['username', 'name', 'email', 'phone', 'role', 'is_active', 'avatar'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = ?";
            $values[] = $input[$field];
        }
    }
    
    if (isset($input['permissions'])) {
        $fields[] = "permissions = ?";
        $values[] = json_encode($input['permissions']);
    }
    
    if (!empty($input['password'])) {
        $fields[] = "password = ?";
        $values[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }
    
    if (empty($fields)) {
        errorResponse('لا توجد بيانات للتحديث');
    }
    
    $values[] = $id;
    $sql = "UPDATE " . table('users') . " SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    
    successResponse(null, 'تم تحديث المستخدم بنجاح');
}

function deleteUser($id) {
    // Cannot delete yourself
    if ($id === $_SESSION['user_id']) {
        errorResponse('لا يمكنك حذف حسابك الخاص');
    }
    
    // Check if last admin
    $stmt = db()->prepare("SELECT COUNT(*) as count FROM " . table('users') . " WHERE role = 'admin' AND is_active = TRUE");
    $stmt->execute();
    $adminCount = $stmt->fetch()['count'];
    
    $stmt = db()->prepare("SELECT role FROM " . table('users') . " WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    if ($user && $user['role'] === 'admin' && $adminCount <= 1) {
        errorResponse('لا يمكن حذف آخر مدير في النظام');
    }
    
    $stmt = db()->prepare("DELETE FROM " . table('users') . " WHERE id = ?");
    $stmt->execute([$id]);
    
    successResponse(null, 'تم حذف المستخدم بنجاح');
}

function getDefaultPermissions($role) {
    $permissions = [
        'admin' => [
            'dashboard' => true, 'reception' => true, 'maintenance' => true,
            'spareParts' => true, 'financial' => true, 'customers' => true,
            'settings' => true, 'users' => true
        ],
        'manager' => [
            'dashboard' => true, 'reception' => true, 'maintenance' => true,
            'spareParts' => true, 'financial' => true, 'customers' => true,
            'settings' => true, 'users' => false
        ],
        'technician' => [
            'dashboard' => true, 'reception' => false, 'maintenance' => true,
            'spareParts' => true, 'financial' => false, 'customers' => false,
            'settings' => false, 'users' => false
        ],
        'receptionist' => [
            'dashboard' => true, 'reception' => true, 'maintenance' => false,
            'spareParts' => false, 'financial' => true, 'customers' => true,
            'settings' => false, 'users' => false
        ]
    ];
    
    return $permissions[$role] ?? $permissions['technician'];
}
