<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$uploadDir = 'uploads/profile_images/';

// Check if directory exists
if (!is_dir($uploadDir)) {
    echo json_encode([
        'success' => false,
        'error' => 'Upload directory does not exist',
        'images' => []
    ]);
    exit();
}

// Get all image files
$images = [];
$files = scandir($uploadDir);

foreach ($files as $file) {
    if ($file === '.' || $file === '..') {
        continue;
    }
    
    $filepath = $uploadDir . $file;
    
    // Check if it's a file and an image
    if (is_file($filepath) && in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
        $baseUrl = 'https://red-goat-592690.hostingersite.com';
        $images[] = [
            'filename' => $file,
            'url' => $baseUrl . '/uploads/profile_images/' . $file,
            'size' => filesize($filepath),
            'modified' => date('Y-m-d H:i:s', filemtime($filepath)),
            'dimensions' => getimagesize($filepath) ? [
                'width' => getimagesize($filepath)[0],
                'height' => getimagesize($filepath)[1]
            ] : null
        ];
    }
}

// Sort by modification time (newest first)
usort($images, function($a, $b) {
    return strtotime($b['modified']) - strtotime($a['modified']);
});

echo json_encode([
    'success' => true,
    'count' => count($images),
    'images' => $images
]);
?>
