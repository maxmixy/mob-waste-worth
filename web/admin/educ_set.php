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
    
    // Get the ID token from session
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
    // Collect debug info (truncate response)
    $firebase_debug[] = [
        'endpoint' => $endpoint,
        'method' => $method,
        'httpCode' => $httpCode,
        'response_preview' => is_string($response) ? substr($response, 0, 1000) : ''
    ];
    
    if ($httpCode === 401) {
        // Token expired or invalid
        session_destroy();
        header('Location: login.php');
        exit();
    }
    
    return json_decode($response, true);
}

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        
        switch($action) {
            case 'create':
            case 'update':
                $data = [
                    'fields' => [
                        'title' => ['stringValue' => $_POST['title']],
                        'material_name' => ['stringValue' => $_POST['material_name']],
                        'content' => ['stringValue' => $_POST['content']],
                        'environmental_impact' => ['stringValue' => $_POST['environmental_impact']],
                        'fun_fact' => ['stringValue' => $_POST['fun_fact']],
                        'recycling_tip' => ['stringValue' => $_POST['recycling_tip']],
                        'updated_at' => ['stringValue' => date('c')]
                    ]
                ];
                
                if ($action === 'create') {
                    $data['fields']['created_at'] = ['stringValue' => date('c')];
                    makeFirebaseRequest('Educational', 'POST', $data);
                } else {
                    makeFirebaseRequest('Educational/' . $_POST['content_id'], 'PATCH', $data);
                }
                break;
                
            case 'delete':
                if (isset($_POST['content_id'])) {
                    makeFirebaseRequest('Educational/' . $_POST['content_id'], 'DELETE');
                }
                break;
        }
        
        // Redirect to prevent form resubmission
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit();
    }
}

// Fetch all educational content
$response = makeFirebaseRequest('Educational');
$contents = isset($response['documents']) ? $response['documents'] : [];

// Function to extract value from Firebase field
function getFieldValue($field) {
    if (!$field) return '';
    $valueKey = array_keys($field)[0];
    return $field[$valueKey];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Educational Content Management - Waste to Worth Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .content-card {
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        .content-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .card-header {
            background-color: #f8f9fa;
            padding: 1rem;
        }
        .content-preview {
            max-height: 150px;
            overflow: hidden;
            position: relative;
        }
        .content-preview::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: linear-gradient(transparent, white);
        }
        .logout-btn {
            position: absolute;
            top: 20px;
            right: 20px;
        }
        .timestamp {
            font-size: 0.8rem;
            color: #6c757d;
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
            <h1>Educational Content Management</h1>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#contentModal" onclick="resetForm()">
                Create New Content
            </button>
        </div>

        <div class="row">
            <?php foreach ($contents as $content): 
                $fields = $content['fields'];
                $contentId = basename($content['name']); // Extract ID from document path
            ?>
            <div class="col-12 mb-4">
                <div class="card content-card">
                    <div class="card-header d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1"><?php echo htmlspecialchars(getFieldValue($fields['title'])); ?></h5>
                            <div class="text-muted">Material: <?php echo htmlspecialchars(getFieldValue($fields['material_name'])); ?></div>
                        </div>
                        <div class="timestamp">
                            Updated: <?php echo date('M j, Y g:i A', strtotime(getFieldValue($fields['updated_at']))); ?>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="content-preview mb-3">
                            <?php echo nl2br(htmlspecialchars(getFieldValue($fields['content']))); ?>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <h6>Environmental Impact</h6>
                                <p class="text-muted small"><?php echo htmlspecialchars(getFieldValue($fields['environmental_impact'])); ?></p>
                            </div>
                            <div class="col-md-4">
                                <h6>Fun Fact</h6>
                                <p class="text-muted small"><?php echo htmlspecialchars(getFieldValue($fields['fun_fact'])); ?></p>
                            </div>
                            <div class="col-md-4">
                                <h6>Recycling Tip</h6>
                                <p class="text-muted small"><?php echo htmlspecialchars(getFieldValue($fields['recycling_tip'])); ?></p>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick='editContent(<?php echo json_encode([
                                "id" => $contentId,
                                "title" => getFieldValue($fields['title']),
                                "material_name" => getFieldValue($fields['material_name']),
                                "content" => getFieldValue($fields['content']),
                                "environmental_impact" => getFieldValue($fields['environmental_impact']),
                                "fun_fact" => getFieldValue($fields['fun_fact']),
                                "recycling_tip" => getFieldValue($fields['recycling_tip'])
                            ]); ?>)'>
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteContent('<?php echo $contentId; ?>', '<?php echo htmlspecialchars(getFieldValue($fields['title'])); ?>')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Content Modal -->
    <div class="modal fade" id="contentModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form id="contentForm" method="POST">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalTitle">Create New Educational Content</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" name="action" id="formAction" value="create">
                        <input type="hidden" name="content_id" id="contentId">
                        
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <label class="form-label">Title</label>
                                <input type="text" class="form-control" name="title" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Material Name</label>
                                <input type="text" class="form-control" name="material_name" required>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Main Content</label>
                            <textarea class="form-control" name="content" rows="6" required></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Environmental Impact</label>
                            <textarea class="form-control" name="environmental_impact" rows="2" required></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Fun Fact</label>
                            <textarea class="form-control" name="fun_fact" rows="2" required></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Recycling Tip</label>
                            <textarea class="form-control" name="recycling_tip" rows="2" required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Content</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal fade" id="deleteModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Delete Educational Content</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    Are you sure you want to delete "<span id="deleteContentTitle"></span>"?
                </div>
                <div class="modal-footer">
                    <form method="POST">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="content_id" id="deleteContentId">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Delete</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const contentModal = new bootstrap.Modal(document.getElementById('contentModal'));
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        const contentForm = document.getElementById('contentForm');

        function resetForm() {
            contentForm.reset();
            document.getElementById('formAction').value = 'create';
            document.getElementById('modalTitle').textContent = 'Create New Educational Content';
            document.getElementById('contentId').value = '';
        }

        function editContent(content) {
            document.getElementById('formAction').value = 'update';
            document.getElementById('modalTitle').textContent = 'Edit Educational Content';
            document.getElementById('contentId').value = content.id;
            
            const form = document.getElementById('contentForm');
            form.title.value = content.title;
            form.material_name.value = content.material_name;
            form.content.value = content.content;
            form.environmental_impact.value = content.environmental_impact;
            form.fun_fact.value = content.fun_fact;
            form.recycling_tip.value = content.recycling_tip;
            
            contentModal.show();
        }

        function deleteContent(contentId, contentTitle) {
            document.getElementById('deleteContentId').value = contentId;
            document.getElementById('deleteContentTitle').textContent = contentTitle;
            deleteModal.show();
        }
    </script>
</body>
</html>
<?php
if (!empty($firebase_debug)) {
    $dbg = json_encode($firebase_debug, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    echo "<script>console.log('Firebase debug:', $dbg);</script>";
}
?>
