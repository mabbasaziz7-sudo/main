<?php
/**
 * نظام إدارة مركز الصيانة
 * ملف التوجيه الرئيسي - للاستضافات التي لا تدعم .htaccess
 */

// الحصول على المسار المطلوب
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// إزالة trailing slash
$path = rtrim($path, '/');

// التحقق من نوع الطلب
if (strpos($path, '/api/') === 0 || $path === '/api') {
    // طلبات API
    $api_path = str_replace('/api/', '', $path);
    $api_path = str_replace('/api', '', $api_path);
    
    if (empty($api_path)) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'message' => 'مرحباً بك في API نظام إدارة مركز الصيانة',
            'version' => '2.0.0',
            'endpoints' => [
                'auth' => '/api/auth',
                'users' => '/api/users',
                'orders' => '/api/orders',
                'customers' => '/api/customers',
                'spare-parts' => '/api/spare-parts',
                'transactions' => '/api/transactions',
                'settings' => '/api/settings'
            ]
        ]);
        exit;
    }
    
    $api_file = __DIR__ . '/api/' . $api_path . '.php';
    
    if (file_exists($api_file)) {
        require $api_file;
    } else {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'API endpoint not found']);
    }
    exit;
}

// التحقق من وجود ملف install.php
if ($path === '/install' || $path === '/install.php') {
    if (file_exists(__DIR__ . '/install.php')) {
        require __DIR__ . '/install.php';
    } else {
        header('Location: /');
    }
    exit;
}

// التحقق من الملفات الثابتة (CSS, JS, Images)
$static_extensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
$extension = pathinfo($path, PATHINFO_EXTENSION);

if (in_array($extension, $static_extensions)) {
    $file_path = __DIR__ . $path;
    if (file_exists($file_path)) {
        // تحديد نوع المحتوى
        $content_types = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject'
        ];
        
        if (isset($content_types[$extension])) {
            header('Content-Type: ' . $content_types[$extension]);
        }
        
        readfile($file_path);
        exit;
    }
}

// لجميع المسارات الأخرى، قدم index.html
$index_file = __DIR__ . '/index.html';

if (file_exists($index_file)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index_file);
} else {
    // صفحة خطأ احتياطية
    http_response_code(500);
    echo '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>خطأ في التثبيت</title>
    <style>
        body {
            font-family: "Segoe UI", Tahoma, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }
        .error-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #666; line-height: 1.8; }
        .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            margin-top: 20px;
        }
        .btn:hover { background: #5a6fd6; }
        code {
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 4px;
            color: #e74c3c;
        }
    </style>
</head>
<body>
    <div class="error-box">
        <h1>⚠️ خطأ في التثبيت</h1>
        <p>ملف <code>index.html</code> غير موجود.</p>
        <p>تأكد من رفع جميع ملفات مجلد <code>dist</code> إلى مجلد الاستضافة.</p>
        <a href="/install.php" class="btn">🔧 معالج التثبيت</a>
    </div>
</body>
</html>';
}
