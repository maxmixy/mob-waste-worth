<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$uploadDir = 'uploads/profile_images/';
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$maxFileSize = 5 * 1024 * 1024; // 5MB
$maxWidth = 400;
$maxHeight = 400;
$baseUrl = 'https://red-goat-592690.hostingersite.com';

// Create upload directory if it doesn't exist
if (!file_exists($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create upload directory']);
        exit();
    }
}

// Get user ID from URL path
$requestUri = $_SERVER['REQUEST_URI'];
$pathParts = explode('/', trim($requestUri, '/'));
$userIndex = array_search('user', $pathParts);

if ($userIndex === false || !isset($pathParts[$userIndex + 1])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID not provided in URL']);
    exit();
}

$userId = $pathParts[$userIndex + 1];
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $userId); // Sanitize user ID

if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user ID']);
    exit();
}

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        handleUpload($userId, $uploadDir, $allowedTypes, $maxFileSize, $maxWidth, $maxHeight, $baseUrl);
        break;
    case 'GET':
        handleGet($userId, $uploadDir, $baseUrl);
        break;
    case 'DELETE':
        handleDelete($userId, $uploadDir);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function handleUpload($userId, $uploadDir, $allowedTypes, $maxFileSize, $maxWidth, $maxHeight, $baseUrl) {
    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No image file uploaded or upload error occurred']);
        exit();
    }

    $file = $_FILES['image'];

    // Validate file type
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP']);
        exit();
    }

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Maximum size: 5MB']);
        exit();
    }

    // Generate unique filename
    $timestamp = date('Ymd_His');
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = $userId . '_' . $timestamp . '.' . $extension;
    $filepath = $uploadDir . $filename;

    // Move uploaded file to destination
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save uploaded file']);
        exit();
    }

    // Process image (resize and optimize)
    try {
        $imageInfo = getimagesize($filepath);
        if (!$imageInfo) {
            unlink($filepath);
            http_response_code(400);
            echo json_encode(['error' => 'Invalid image file']);
            exit();
        }

        $originalWidth = $imageInfo[0];
        $originalHeight = $imageInfo[1];
        $mimeType = $imageInfo['mime'];

        // Create image resource based on type
        switch ($mimeType) {
            case 'image/jpeg':
                $sourceImage = imagecreatefromjpeg($filepath);
                break;
            case 'image/png':
                $sourceImage = imagecreatefrompng($filepath);
                break;
            case 'image/gif':
                $sourceImage = imagecreatefromgif($filepath);
                break;
            case 'image/webp':
                $sourceImage = imagecreatefromwebp($filepath);
                break;
            default:
                unlink($filepath);
                http_response_code(400);
                echo json_encode(['error' => 'Unsupported image format']);
                exit();
        }

        if (!$sourceImage) {
            unlink($filepath);
            http_response_code(500);
            echo json_encode(['error' => 'Failed to process image']);
            exit();
        }

        // Calculate new dimensions (maintain aspect ratio, crop to square)
        $size = min($originalWidth, $originalHeight);
        $cropX = ($originalWidth - $size) / 2;
        $cropY = ($originalHeight - $size) / 2;

        // Create new square image
        $newImage = imagecreatetruecolor($maxWidth, $maxHeight);
        
        // Preserve transparency for PNG and GIF
        if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            $transparent = imagecolorallocatealpha($newImage, 255, 255, 255, 127);
            imagefill($newImage, 0, 0, $transparent);
        }

        // Resize and crop
        imagecopyresampled(
            $newImage, $sourceImage,
            0, 0, $cropX, $cropY,
            $maxWidth, $maxHeight, $size, $size
        );

        // Save as JPEG (for consistency and smaller file size)
        $finalFilename = $userId . '_' . $timestamp . '.jpg';
        $finalFilepath = $uploadDir . $finalFilename;
        
        if (!imagejpeg($newImage, $finalFilepath, 85)) {
            unlink($filepath);
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save processed image']);
            exit();
        }

        // Clean up
        imagedestroy($sourceImage);
        imagedestroy($newImage);
        
        // Remove original file if it's different from final file
        if ($filepath !== $finalFilepath) {
            unlink($filepath);
        }

        // Generate response
        $imageUrl = $baseUrl . '/uploads/profile_images/' . $finalFilename;
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile image uploaded successfully',
            'imageUrl' => $imageUrl
        ]);

    } catch (Exception $e) {
        // Clean up on error
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        if (isset($finalFilepath) && file_exists($finalFilepath)) {
            unlink($finalFilepath);
        }
        
        http_response_code(500);
        echo json_encode(['error' => 'Image processing failed: ' . $e->getMessage()]);
    }
}

function handleGet($userId, $uploadDir, $baseUrl) {
    // Look for existing profile image for this user
    $files = scandir($uploadDir);
    $userImage = null;
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        // Check if file belongs to this user (starts with user ID)
        if (strpos($file, $userId . '_') === 0) {
            $filepath = $uploadDir . $file;
            if (is_file($filepath)) {
                $userImage = [
                    'filename' => $file,
                    'url' => $baseUrl . '/uploads/profile_images/' . $file,
                    'modified' => date('Y-m-d H:i:s', filemtime($filepath))
                ];
                break; // Use the first (oldest) image found
            }
        }
    }
    
    if ($userImage) {
        echo json_encode([
            'success' => true,
            'hasImage' => true,
            'imageUrl' => $userImage['url'],
            'updatedAt' => $userImage['modified']
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'hasImage' => false,
            'message' => 'No profile image found'
        ]);
    }
}

function handleDelete($userId, $uploadDir) {
    // Look for and delete user's profile image
    $files = scandir($uploadDir);
    $deleted = false;
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        // Check if file belongs to this user
        if (strpos($file, $userId . '_') === 0) {
            $filepath = $uploadDir . $file;
            if (is_file($filepath)) {
                if (unlink($filepath)) {
                    $deleted = true;
                }
            }
        }
    }
    
    if ($deleted) {
        echo json_encode([
            'success' => true,
            'message' => 'Profile image deleted successfully'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'No profile image to delete'
        ]);
    }
}
?>
