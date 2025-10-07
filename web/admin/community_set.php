<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_token'])) {
    header('Location: login.php');
    exit();
}

// Firebase configuration
$firebaseConfig = array(
    "apiKey" => "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
    "projectId" => "waste-to-worth-7d5b0"
);

// Debug info collector for Firebase requests
$firebase_debug = [];

// Function to make authenticated requests to Firebase
function makeFirebaseRequest($endpoint, $method = 'GET', $data = null) {
    global $firebaseConfig;
    global $firebase_debug;
    
    $idToken = $_SESSION['user_token'];
    $url = "https://firestore.googleapis.com/v1/projects/{$firebaseConfig['projectId']}/databases/(default)/documents/" . $endpoint;
    
    $ch = curl_init($url);
    
    $headers = [
        'Authorization: Bearer ' . $idToken,
        'Content-Type: application/json',
    ];
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    if ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    // Collect debug info (truncate response to avoid leaking large data)
    $firebase_debug[] = [
        'endpoint' => $endpoint,
        'method' => $method,
        'httpCode' => $httpCode,
        'response_preview' => is_string($response) ? substr($response, 0, 1000) : ''
    ];
    
    if ($httpCode === 401) {
        session_destroy();
        header('Location: login.php');
        exit();
    }
    
    return json_decode($response, true);
}

// Handle post moderation actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch($_POST['action']) {
            case 'delete_post':
                // Delete associated media first
                $mediaResponse = makeFirebaseRequest("Post_Media?orderBy=post_id&equalTo=" . $_POST['post_id'], 'GET');
                if (isset($mediaResponse['documents'])) {
                    foreach ($mediaResponse['documents'] as $media) {
                        $mediaId = basename($media['name']);
                        makeFirebaseRequest("Post_Media/{$mediaId}", 'DELETE');
                        
                        // Delete the actual media file
                        if (isset($media['fields']['media_path']['stringValue'])) {
                            $mediaUrl = $media['fields']['media_path']['stringValue'];
                            // Make DELETE request to remove the file
                            $ch = curl_init($mediaUrl);
                            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_exec($ch);
                            curl_close($ch);
                        }
                    }
                }
                
                // Delete associated comments
                $commentsResponse = makeFirebaseRequest("Post_Comments?orderBy=post_id&equalTo=" . $_POST['post_id'], 'GET');
                if (isset($commentsResponse['documents'])) {
                    foreach ($commentsResponse['documents'] as $comment) {
                        $commentId = basename($comment['name']);
                        makeFirebaseRequest("Post_Comments/{$commentId}", 'DELETE');
                    }
                }
                
                // Finally delete the post
                makeFirebaseRequest("Posts/" . $_POST['post_id'], 'DELETE');
                break;
                
            case 'update_status':
                $data = [
                    'fields' => [
                        'status' => ['stringValue' => $_POST['status']],
                        'updated_at' => ['timestampValue' => date('c')]
                    ]
                ];
                makeFirebaseRequest("Posts/" . $_POST['post_id'], 'PATCH', $data);
                break;
                
            case 'delete_comment':
                makeFirebaseRequest("Post_Comments/" . $_POST['comment_id'], 'DELETE');
                break;
        }
        
        // Redirect to prevent form resubmission
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit();
    }
}

// Fetch all posts with their media and comments
$postsResponse = makeFirebaseRequest('Posts');
$posts = isset($postsResponse['documents']) ? $postsResponse['documents'] : [];

// Function to extract value from Firebase field
function getFieldValue($field) {
    if (!$field) return '';
    $valueKey = array_keys($field)[0];
    return $field[$valueKey];
}

// Function to fetch user details
function getUserDetails($userId) {
    static $userCache = [];
    
    if (isset($userCache[$userId])) {
        return $userCache[$userId];
    }
    
    $response = makeFirebaseRequest("Users/{$userId}");
    if (isset($response['fields'])) {
        $userCache[$userId] = [
            'name' => getFieldValue($response['fields']['name'] ?? ['stringValue' => 'Unknown User']),
            'profile_picture' => getFieldValue($response['fields']['profile_picture'] ?? ['stringValue' => 'default.jpg'])
        ];
        return $userCache[$userId];
    }
    
    return ['name' => 'Unknown User', 'profile_picture' => 'default.jpg'];
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Moderation - Waste to Worth Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .post-card {
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        .post-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .media-preview {
            height: 200px;
            background-color: #f8f9fa;
            overflow: hidden;
        }
        .media-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 10px;
        }
        .comment {
            padding: 10px;
            border-radius: 4px;
            background-color: #f8f9fa;
            margin-bottom: 8px;
        }
        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        .status-badge {
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
            <h1>Community Post Moderation</h1>
        </div>

        <?php foreach ($posts as $post): 
            $postId = basename($post['name']);
            $fields = $post['fields'];
            $userId = getFieldValue($fields['user_id']);
            $user = getUserDetails($userId);
            
            // Fetch media for this post
            $mediaResponse = makeFirebaseRequest("Post_Media?orderBy=post_id&equalTo={$postId}");
            $media = isset($mediaResponse['documents']) ? $mediaResponse['documents'] : [];
            
            // Fetch comments for this post
            $commentsResponse = makeFirebaseRequest("Post_Comments?orderBy=post_id&equalTo={$postId}");
            $comments = isset($commentsResponse['documents']) ? $commentsResponse['documents'] : [];
        ?>
        <div class="card post-card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <img src="<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="" class="user-avatar">
                        <div>
                            <div class="fw-bold"><?php echo htmlspecialchars($user['name']); ?></div>
                            <div class="text-muted small">
                                <?php echo date('M j, Y g:i A', strtotime(getFieldValue($fields['created_at']))); ?>
                            </div>
                        </div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                            Status: <?php echo ucfirst(getFieldValue($fields['status'])); ?>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="update_status">
                                    <input type="hidden" name="post_id" value="<?php echo $postId; ?>">
                                    <input type="hidden" name="status" value="published">
                                    <button type="submit" class="dropdown-item">Published</button>
                                </form>
                            </li>
                            <li>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="update_status">
                                    <input type="hidden" name="post_id" value="<?php echo $postId; ?>">
                                    <input type="hidden" name="status" value="hidden">
                                    <button type="submit" class="dropdown-item">Hidden</button>
                                </form>
                            </li>
                        </ul>
                        <button class="btn btn-outline-danger btn-sm" onclick="confirmDeletePost('<?php echo $postId; ?>')">
                            Delete Post
                        </button>
                    </div>
                </div>
            </div>
            
            <?php if (!empty($media)): ?>
            <div class="row g-0">
                <?php foreach ($media as $mediaItem): 
                    $mediaFields = $mediaItem['fields'];
                ?>
                <div class="col-md-4">
                    <div class="media-preview">
                        <img src="<?php echo htmlspecialchars(getFieldValue($mediaFields['media_path'])); ?>" 
                             alt="Post media" loading="lazy">
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
            
            <div class="card-body">
                <p class="card-text"><?php echo nl2br(htmlspecialchars(getFieldValue($fields['content_text']))); ?></p>
                
                <?php if (!empty($comments)): ?>
                <hr>
                <h6>Comments (<?php echo count($comments); ?>)</h6>
                <?php foreach ($comments as $comment):
                    $commentFields = $comment['fields'];
                    $commentId = basename($comment['name']);
                    $commentUserId = getFieldValue($commentFields['user_id']);
                    $commentUser = getUserDetails($commentUserId);
                ?>
                <div class="comment">
                    <div class="comment-header">
                        <div class="d-flex align-items-center">
                            <img src="<?php echo htmlspecialchars($commentUser['profile_picture']); ?>" alt="" class="user-avatar" style="width: 24px; height: 24px;">
                            <div>
                                <span class="fw-bold"><?php echo htmlspecialchars($commentUser['name']); ?></span>
                                <small class="text-muted ms-2">
                                    <?php echo date('M j, Y g:i A', strtotime(getFieldValue($commentFields['created_at']))); ?>
                                </small>
                            </div>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteComment('<?php echo $commentId; ?>')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="mt-1">
                        <?php echo htmlspecialchars(getFieldValue($commentFields['comment_text'])); ?>
                    </div>
                </div>
                <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <!-- Delete Post Confirmation Modal -->
    <div class="modal fade" id="deletePostModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Delete Post</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this post? This will also delete all associated media and comments.</p>
                    <p class="text-danger"><strong>This action cannot be undone.</strong></p>
                </div>
                <div class="modal-footer">
                    <form method="POST">
                        <input type="hidden" name="action" value="delete_post">
                        <input type="hidden" name="post_id" id="deletePostId">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Delete Post</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Comment Confirmation Modal -->
    <div class="modal fade" id="deleteCommentModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Delete Comment</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this comment?</p>
                    <p class="text-danger"><strong>This action cannot be undone.</strong></p>
                </div>
                <div class="modal-footer">
                    <form method="POST">
                        <input type="hidden" name="action" value="delete_comment">
                        <input type="hidden" name="comment_id" id="deleteCommentId">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Delete Comment</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const deletePostModal = new bootstrap.Modal(document.getElementById('deletePostModal'));
        const deleteCommentModal = new bootstrap.Modal(document.getElementById('deleteCommentModal'));

        function confirmDeletePost(postId) {
            document.getElementById('deletePostId').value = postId;
            deletePostModal.show();
        }

        function confirmDeleteComment(commentId) {
            document.getElementById('deleteCommentId').value = commentId;
            deleteCommentModal.show();
        }
    </script>
</body>
</html>
<?php
// Expose debug info to browser console (if any)
if (!empty($firebase_debug)) {
    $dbg = json_encode($firebase_debug, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    echo "<script>console.log('Firebase debug:', $dbg);</script>";
}
?>
