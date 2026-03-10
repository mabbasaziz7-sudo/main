<?php
/**
 * API Router
 * نظام إدارة مركز الصيانة
 */

// Get the requested endpoint
$endpoint = $_GET['endpoint'] ?? '';

// Remove any path traversal attempts
$endpoint = basename($endpoint);

// Map endpoints to files
$endpoints = [
    'auth' => 'auth.php',
    'users' => 'users.php',
    'orders' => 'orders.php',
    'customers' => 'customers.php',
    'spare-parts' => 'spare-parts.php',
    'transactions' => 'transactions.php',
    'settings' => 'settings.php'
];

if (isset($endpoints[$endpoint])) {
    require_once __DIR__ . '/' . $endpoints[$endpoint];
} else {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Endpoint not found',
        'available_endpoints' => array_keys($endpoints)
    ], JSON_UNESCAPED_UNICODE);
}
