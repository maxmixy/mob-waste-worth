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

// Debug info collector
$firebase_debug = [];

// Check if user is logged in
if (!isset($_SESSION['user_token'])) {
    header('Location: login.php');
    exit();
}

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
                        'description' => ['stringValue' => $_POST['description']],
                        'category' => ['stringValue' => $_POST['category']],
                        'type' => ['stringValue' => $_POST['type']],
                        'difficulty_level' => ['stringValue' => $_POST['difficulty_level']],
                        'points' => ['integerValue' => intval($_POST['points'])],
                        'target_count' => ['integerValue' => intval($_POST['target_count'])],
                        'icon' => ['stringValue' => $_POST['icon']],
                        'is_active' => ['booleanValue' => isset($_POST['is_active'])],
                        'is_repeatable' => ['booleanValue' => isset($_POST['is_repeatable'])],
                        'updated_at' => ['timestampValue' => date('c')]
                    ]
                ];
                
                if ($action === 'create') {
                    $data['fields']['created_at'] = ['timestampValue' => date('c')];
                    makeFirebaseRequest('Quests', 'POST', $data);
                } else {
                    makeFirebaseRequest('Quests/' . $_POST['quest_id'], 'PATCH', $data);
                }
                break;
                
            case 'delete':
                if (isset($_POST['quest_id'])) {
                    makeFirebaseRequest('Quests/' . $_POST['quest_id'], 'DELETE');
                }
                break;
        }
        
        // Redirect to prevent form resubmission
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit();
    }
}

// Fetch all quests
$response = makeFirebaseRequest('Quests');
$quests = isset($response['documents']) ? $response['documents'] : [];

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
    <title>Quest Management - Waste to Worth Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .quest-card {
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }
        .quest-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .status-badge {
            position: absolute;
            top: 10px;
            right: 10px;
        }
        .quest-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .quest-icon {
            font-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-radius: 8px;
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
            <h1>Quest Management</h1>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#questModal" onclick="resetForm()">
                Create New Quest
            </button>
        </div>

        <div class="row">
            <?php foreach ($quests as $quest): 
                $fields = $quest['fields'];
                $questId = basename($quest['name']); // Extract ID from document path
            ?>
            <div class="col-md-6 col-lg-4">
                <div class="card quest-card">
                    <div class="card-body">
                        <span class="status-badge badge <?php echo getFieldValue($fields['is_active']) ? 'bg-success' : 'bg-secondary'; ?>">
                            <?php echo getFieldValue($fields['is_active']) ? 'Active' : 'Inactive'; ?>
                        </span>
                        <div class="quest-header mb-3">
                            <div class="quest-icon">
                                <i class="bi bi-<?php echo htmlspecialchars(getFieldValue($fields['icon'])); ?>"></i>
                            </div>
                            <h5 class="card-title mb-0"><?php echo htmlspecialchars(getFieldValue($fields['title'])); ?></h5>
                        </div>
                        <p class="card-text"><?php echo htmlspecialchars(getFieldValue($fields['description'])); ?></p>
                        <div class="mb-2">
                            <span class="badge bg-primary"><?php echo htmlspecialchars(getFieldValue($fields['category'])); ?></span>
                            <span class="badge bg-info"><?php echo htmlspecialchars(getFieldValue($fields['difficulty_level'])); ?></span>
                            <span class="badge bg-warning text-dark"><?php echo getFieldValue($fields['points']); ?> points</span>
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick='editQuest(<?php echo json_encode([
                                "id" => $questId,
                                "title" => getFieldValue($fields['title']),
                                "description" => getFieldValue($fields['description']),
                                "category" => getFieldValue($fields['category']),
                                "type" => getFieldValue($fields['type']),
                                "icon" => getFieldValue($fields['icon']),
                                "difficulty_level" => getFieldValue($fields['difficulty_level']),
                                "points" => getFieldValue($fields['points']),
                                "target_count" => getFieldValue($fields['target_count']),
                                "is_active" => getFieldValue($fields['is_active']),
                                "is_repeatable" => getFieldValue($fields['is_repeatable'])
                            ]); ?>)'>
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteQuest('<?php echo $questId; ?>', '<?php echo htmlspecialchars(getFieldValue($fields['title'])); ?>')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Quest Modal -->
    <div class="modal fade" id="questModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form id="questForm" method="POST">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalTitle">Create New Quest</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" name="action" id="formAction" value="create">
                        <input type="hidden" name="quest_id" id="questId">
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Title</label>
                                <input type="text" class="form-control" name="title" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Category</label>
                                <input type="text" class="form-control" name="category" required>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3" required></textarea>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Type</label>
                                <input type="text" class="form-control" name="type" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Icon (Bootstrap Icons class name)</label>
                                <input type="text" class="form-control" name="icon" required>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <label class="form-label">Difficulty Level</label>
                                <select class="form-select" name="difficulty_level" required>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Points</label>
                                <input type="number" class="form-control" name="points" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Target Count</label>
                                <input type="number" class="form-control" name="target_count" required>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_active" id="isActive">
                                    <label class="form-check-label" for="isActive">Active</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_repeatable" id="isRepeatable">
                                    <label class="form-check-label" for="isRepeatable">Repeatable</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Quest</button>
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
                    <h5 class="modal-title">Delete Quest</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    Are you sure you want to delete "<span id="deleteQuestTitle"></span>"?
                </div>
                <div class="modal-footer">
                    <form method="POST">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="quest_id" id="deleteQuestId">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger">Delete</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const questModal = new bootstrap.Modal(document.getElementById('questModal'));
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        const questForm = document.getElementById('questForm');

        function resetForm() {
            questForm.reset();
            document.getElementById('formAction').value = 'create';
            document.getElementById('modalTitle').textContent = 'Create New Quest';
            document.getElementById('questId').value = '';
        }

        function editQuest(quest) {
            document.getElementById('formAction').value = 'update';
            document.getElementById('modalTitle').textContent = 'Edit Quest';
            document.getElementById('questId').value = quest.id;
            
            const form = document.getElementById('questForm');
            form.title.value = quest.title;
            form.category.value = quest.category;
            form.description.value = quest.description;
            form.type.value = quest.type;
            form.icon.value = quest.icon;
            form.difficulty_level.value = quest.difficulty_level;
            form.points.value = quest.points;
            form.target_count.value = quest.target_count;
            form.is_active.checked = quest.is_active;
            form.is_repeatable.checked = quest.is_repeatable;
            
            questModal.show();
        }

        function deleteQuest(questId, questTitle) {
            document.getElementById('deleteQuestId').value = questId;
            document.getElementById('deleteQuestTitle').textContent = questTitle;
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
