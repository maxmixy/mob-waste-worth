<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No image file provided or upload error');
    }

    $file = $_FILES['image'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $fileType = mime_content_type($file['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        throw new Exception('Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP');
    }
    
    // Check file size (5MB max)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        throw new Exception('File too large. Maximum size: 5MB');
    }
    
    // Create uploads/posts directory if it doesn't exist
    $uploadDir = 'uploads/posts/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $timestamp = date('Ymd_His');
    $randomId = substr(md5(uniqid(rand(), true)), 0, 8);
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "post_{$timestamp}_{$randomId}.{$extension}";
    
    $filePath = $uploadDir . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to save uploaded file');
    }
    
    // Process image (resize and optimize)
    $imageInfo = getimagesize($filePath);
    if ($imageInfo === false) {
        unlink($filePath); // Clean up
        throw new Exception('Invalid image file');
    }
    
    $width = $imageInfo[0];
    $height = $imageInfo[1];
    $mimeType = $imageInfo['mime'];
    
    // Resize image if it's too large (max 800x600)
    $maxWidth = 800;
    $maxHeight = 600;
    
    if ($width > $maxWidth || $height > $maxHeight) {
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = intval($width * $ratio);
        $newHeight = intval($height * $ratio);
        
        // Create image resource based on type
        switch ($mimeType) {
            case 'image/jpeg':
                $source = imagecreatefromjpeg($filePath);
                break;
            case 'image/png':
                $source = imagecreatefrompng($filePath);
                break;
            case 'image/gif':
                $source = imagecreatefromgif($filePath);
                break;
            case 'image/webp':
                $source = imagecreatefromwebp($filePath);
                break;
            default:
                unlink($filePath);
                throw new Exception('Unsupported image format');
        }
        
        if ($source === false) {
            unlink($filePath);
            throw new Exception('Failed to process image');
        }
        
        // Create resized image
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG and GIF
        if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
            imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        // Resize
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Save resized image as JPEG
        $newFilePath = $uploadDir . "post_{$timestamp}_{$randomId}.jpg";
        if (!imagejpeg($resized, $newFilePath, 85)) {
            unlink($filePath);
            throw new Exception('Failed to save processed image');
        }
        
        // Clean up
        imagedestroy($source);
        imagedestroy($resized);
        
        // Remove original if it's different from processed
        if ($filePath !== $newFilePath) {
            unlink($filePath);
            $filePath = $newFilePath;
            $filename = "post_{$timestamp}_{$randomId}.jpg";
        }
    }
    
    // Generate full URL
    $baseUrl = 'https://red-goat-592690.hostingersite.com';
    $imageUrl = $baseUrl . '/' . $filePath;
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Post image uploaded successfully',
        'imageUrl' => $imageUrl,
        'imagePath' => $imageUrl,
        'filename' => $filename
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
