<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_token'])) {
    header('Location: login.php');
    exit();
}

// Base URL for the uploads
$baseUrl = 'https://red-goat-592690.hostingersite.com/uploads';

// Basic debug collector
$firebase_debug = [];

// remote fetching removed — admin moderation uses local uploads directly (same method as list_images.php)

// Fallback: read images from local uploads directory on the server
function getLocalImages($folder) {
    // uploads directory is one level up from web/admin (web/uploads)
    $uploadsBase = realpath(__DIR__ . '/../uploads');
    $result = [];
    if (!$uploadsBase) return $result;

    $dir = $uploadsBase . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($dir)) return $result;

    $files = scandir($dir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        if (!preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $f)) continue;

        $path = $dir . DIRECTORY_SEPARATOR . $f;
        if (!is_file($path)) continue;

        $size = filesize($path);
        $mtime = filemtime($path);
        $modifiedStr = date('Y-m-d H:i:s', $mtime);
        $dims = @getimagesize($path);
        $dimensions = $dims ? ['width' => $dims[0], 'height' => $dims[1]] : null;

        global $baseUrl;
        $result[] = [
            'filename' => $f,
            // Use same base URL strategy as list_images.php
            'url' => rtrim($baseUrl, '/') . '/' . $folder . '/' . $f,
            'size' => $size,
            'modified' => $modifiedStr,
            'dimensions' => $dimensions,
            'last_modified' => $mtime
        ];
    }

    // Sort by modification time (newest first)
    usort($result, function($a, $b) {
        return ($b['last_modified'] ?? 0) - ($a['last_modified'] ?? 0);
    });

    return $result;
}

// Handle image deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete') {
    $imageUrl = $_POST['image_url'];
    global $firebase_debug;

    // If the URL is within our app's base uploads URL or a local /uploads path, delete from disk
    $uploadsWebBase = realpath(__DIR__ . '/../uploads');
    $localPath = null;
    if (strpos($imageUrl, '/uploads/') === 0) {
        $relative = ltrim(substr($imageUrl, strlen('/uploads/')), "\/ ");
        $localPath = $uploadsWebBase . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    } elseif (strpos($imageUrl, $baseUrl . '/uploads/') === 0) {
        $relative = substr($imageUrl, strlen($baseUrl . '/uploads/'));
        $localPath = $uploadsWebBase . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    }

        // Safety: ensure localPath is inside uploadsBase
        $realLocal = $localPath ? realpath($localPath) : false;
        if ($realLocal && $uploadsWebBase && strpos($realLocal, $uploadsWebBase) === 0 && is_file($realLocal)) {
            $deleted = @unlink($realLocal);
            $firebase_debug[] = [
                'endpoint' => $imageUrl,
                'method' => 'DELETE_LOCAL',
                'httpCode' => $deleted ? 200 : 500,
                'response_preview' => $deleted ? 'deleted' : 'unlink_failed'
            ];
        } else {
            $firebase_debug[] = [
                'endpoint' => $imageUrl,
                'method' => 'DELETE_LOCAL',
                'httpCode' => 404,
                'response_preview' => 'file_not_found_or_invalid_path'
            ];
        }

    header('Location: ' . $_SERVER['PHP_SELF']);
    exit();

    // Otherwise attempt remote DELETE (previous behavior)
    if (strpos($imageUrl, 'http') === 0) {
        $ch = curl_init($imageUrl);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);
        $firebase_debug[] = [
            'endpoint' => $imageUrl,
            'method' => 'DELETE_REMOTE',
            'httpCode' => $httpCode ?: 'unknown',
            'response_preview' => substr($curlErr ?: '', 0, 200)
        ];
    } else {
        // Unrecognized URL format
        $firebase_debug[] = [
            'endpoint' => $imageUrl,
            'method' => 'DELETE',
            'httpCode' => 'invalid_url',
            'response_preview' => 'unsupported_url_format'
        ];
    }

    // Redirect to prevent form resubmission
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit();
}

// Get images from different folders
$folders = ['posts', 'profile_images'];
$allImages = [];

foreach ($folders as $folder) {
    // Always scan the local uploads directory (same method as list_images.php / gallery.html)
    $images = getLocalImages($folder);
    foreach ($images as $image) {
        // image from getLocalImages() supplies filename, url, size, modified, dimensions, last_modified
        $allImages[] = [
            'url' => $image['url'],
            'folder' => $folder,
            'filename' => $image['filename'],
            'date' => $image['last_modified'] ?: time(),
            'size' => $image['size'] ?? null,
            'modified' => $image['modified'] ?? null,
            'dimensions' => $image['dimensions'] ?? null
        ];
    }
}

// Sort images by date (newest first)
usort($allImages, function($a, $b) {
    return $b['date'] - $a['date'];
});
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Moderation - Waste to Worth Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .image-card {
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        .image-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .image-preview {
            position: relative;
            padding-bottom: 100%;
            background-color: #f8f9fa;
            overflow: hidden;
        }
        .image-preview img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .image-preview:hover .image-overlay {
            opacity: 1;
        }
        .folder-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1;
        }
        .date-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1;
        }
        .logout-btn {
            position: absolute;
            top: 20px;
            right: 20px;
        }
        .filters {
            margin-bottom: 20px;
        }
        .header-buttons {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="container py-4">
        <div class="header-buttons">
            <a href="index.php" class="btn btn-outline-primary">Back to Dashboard</a>
            <a href="logout.php" class="btn btn-outline-danger">Logout</a>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1>Image Moderation</h1>
        </div>

        <div class="filters">
            <div class="btn-group" role="group">
                <input type="radio" class="btn-check" name="folder-filter" id="all" value="all" checked>
                <label class="btn btn-outline-primary" for="all">All Folders</label>
                <?php foreach ($folders as $folder): ?>
                <input type="radio" class="btn-check" name="folder-filter" id="<?php echo $folder; ?>" value="<?php echo $folder; ?>">
                <label class="btn btn-outline-primary" for="<?php echo $folder; ?>"><?php echo ucfirst(str_replace('_', ' ', $folder)); ?></label>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="row" id="imageGrid">
            <?php foreach ($allImages as $image): ?>
            <div class="col-md-3 image-card" data-folder="<?php echo $image['folder']; ?>">
                <div class="card">
                    <div class="image-preview">
                        <span class="badge bg-primary folder-badge"><?php echo ucfirst(str_replace('_', ' ', $image['folder'])); ?></span>
                        <span class="badge bg-secondary date-badge"><?php echo date('M j, Y', $image['date']); ?></span>
                        <img src="<?php echo htmlspecialchars($image['url']); ?>" alt="<?php echo htmlspecialchars($image['filename']); ?>" loading="lazy">
                        <div class="image-overlay">
                            <div class="btn-group">
                                <a href="<?php echo htmlspecialchars($image['url']); ?>" class="btn btn-sm btn-light" target="_blank">
                                    <i class="bi bi-eye"></i> View
                                </a>
                                <button type="button" class="btn btn-sm btn-danger" onclick="confirmDelete('<?php echo htmlspecialchars($image['url']); ?>', '<?php echo htmlspecialchars($image['filename']); ?>')">
                                    <i class="bi bi-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer text-muted small">
                        <div><?php echo htmlspecialchars($image['filename']); ?></div>
                        <?php if (!empty($image['dimensions'])): ?>
                            <div class="text-muted small"><?php echo $image['dimensions']['width'] . ' × ' . $image['dimensions']['height']; ?> px</div>
                        <?php endif; ?>
                        <?php if (!empty($image['size'])): ?>
                            <div class="text-muted small"><?php echo round($image['size'] / 1024, 1); ?> KB</div>
                        <?php endif; ?>
                        <?php if (!empty($image['modified'])): ?>
                            <div class="text-muted small"><?php echo htmlspecialchars($image['modified']); ?></div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal fade" id="deleteModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Remove Image</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to remove this image?</p>
                    <p class="text-muted" id="deleteImageName"></p>
                </div>
                <div class="modal-footer">
                    <form method="POST">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="image_url" id="deleteImageUrl">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Remove Image</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

        function confirmDelete(imageUrl, imageName) {
            document.getElementById('deleteImageUrl').value = imageUrl;
            document.getElementById('deleteImageName').textContent = imageName;
            deleteModal.show();
        }

        // Folder filtering
        document.querySelectorAll('input[name="folder-filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedFolder = e.target.value;
                document.querySelectorAll('.image-card').forEach(card => {
                    if (selectedFolder === 'all' || card.dataset.folder === selectedFolder) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    </script>
</body>
</html>
<?php
if (!empty($firebase_debug)) {
    $dbg = json_encode($firebase_debug, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    echo "<script>console.log('Firebase debug:', $dbg);</script>";
}
?>
