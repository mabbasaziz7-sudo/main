<?php
/**
 * Authentication API
 * نظام إدارة مركز الصيانة
 */

require_once __DIR__ . '/db.php';
setCorsHeaders();

session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'login':
            if ($method !== 'POST') {
                errorResponse('Method not allowed', 405);
            }
            handleLogin();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'check':
            checkSession();
            break;
            
        case 'change-password':
            if ($method !== 'POST') {
                errorResponse('Method not allowed', 405);
            }
            changePassword();
            break;
            
        default:
            errorResponse('Invalid action', 400);
    }
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}

function handleLogin() {
    $input = getJsonInput();
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        errorResponse('اسم المستخدم وكلمة المرور مطلوبان');
    }
    
    $stmt = db()->prepare("SELECT * FROM " . table('users') . " WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        errorResponse('اسم المستخدم غير موجود');
    }
    
    if (!$user['is_active']) {
        errorResponse('هذا الحساب معطّل. تواصل مع المدير.');
    }
    
    if (!password_verify($password, $user['password'])) {
        errorResponse('كلمة المرور غير صحيحة');
    }
    
    // Update last login
    $stmt = db()->prepare("UPDATE " . table('users') . " SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    // Create session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'];
    
    // Remove password from response
    unset($user['password']);
    $user['permissions'] = json_decode($user['permissions'], true);
    
    successResponse(['user' => $user], 'تم تسجيل الدخول بنجاح');
}

function handleLogout() {
    session_destroy();
    successResponse(null, 'تم تسجيل الخروج');
}

function checkSession() {
    if (!isset($_SESSION['user_id'])) {
        errorResponse('غير مصرح', 401);
    }
    
    $stmt = db()->prepare("SELECT * FROM " . table('users') . " WHERE id = ? AND is_active = TRUE");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        session_destroy();
        errorResponse('الجلسة منتهية', 401);
    }
    
    unset($user['password']);
    $user['permissions'] = json_decode($user['permissions'], true);
    
    successResponse(['user' => $user]);
}

function changePassword() {
    if (!isset($_SESSION['user_id'])) {
        errorResponse('غير مصرح', 401);
    }
    
    $input = getJsonInput();
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    
    if (empty($currentPassword) || empty($newPassword)) {
        errorResponse('جميع الحقول مطلوبة');
    }
    
    if (strlen($newPassword) < 6) {
        errorResponse('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    }
    
    $stmt = db()->prepare("SELECT password FROM " . table('users') . " WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!password_verify($currentPassword, $user['password'])) {
        errorResponse('كلمة المرور الحالية غير صحيحة');
    }
    
    $stmt = db()->prepare("UPDATE " . table('users') . " SET password = ? WHERE id = ?");
    $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $_SESSION['user_id']]);
    
    successResponse(null, 'تم تغيير كلمة المرور بنجاح');
}
