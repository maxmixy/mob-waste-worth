<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_token'])) {
    header('Location: login.php');
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Waste to Worth</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .dashboard-card {
            height: 100%;
            transition: all 0.3s ease;
            border: none;
            border-radius: 12px;
            background: linear-gradient(145deg, #ffffff, #f5f5f5);
            box-shadow: 5px 5px 10px #e6e6e6, -5px -5px 10px #ffffff;
        }
        .dashboard-card:hover {
            transform: translateY(-5px);
            box-shadow: 8px 8px 15px #e6e6e6, -8px -8px 15px #ffffff;
        }
        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #4CAF50;
        }
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .logout-btn {
            position: absolute;
            top: 20px;
            right: 20px;
        }
        .nav-link {
            text-decoration: none;
            color: inherit;
        }
        .nav-link:hover {
            color: inherit;
        }
    </style>
</head>
<body class="bg-light">
    <div class="container py-5">
        <a href="logout.php" class="btn btn-outline-danger logout-btn">Logout</a>
        
        <div class="text-center mb-5">
            <h1 class="display-4 mb-3">Waste to Worth Admin</h1>
            <p class="lead text-muted">Manage and moderate your platform's content</p>
        </div>

        <div class="row g-4">
            <!-- Community Posts Management -->
            <div class="col-md-6 col-lg-3">
                <a href="community_set.php" class="nav-link">
                    <div class="card dashboard-card">
                        <div class="card-body text-center">
                            <i class="bi bi-people-fill card-icon"></i>
                            <h5 class="card-title">Community Posts</h5>
                            <p class="card-text">Moderate user posts, comments, and media content</p>
                        </div>
                    </div>
                </a>
            </div>

            <!-- Educational Content Management -->
            <div class="col-md-6 col-lg-3">
                <a href="educ_set.php" class="nav-link">
                    <div class="card dashboard-card">
                        <div class="card-body text-center">
                            <i class="bi bi-book-fill card-icon"></i>
                            <h5 class="card-title">Educational Content</h5>
                            <p class="card-text">Manage educational materials and resources</p>
                        </div>
                    </div>
                </a>
            </div>

            <!-- Quest Management -->
            <div class="col-md-6 col-lg-3">
                <a href="quest_set.php" class="nav-link">
                    <div class="card dashboard-card">
                        <div class="card-body text-center">
                            <i class="bi bi-trophy-fill card-icon"></i>
                            <h5 class="card-title">Quests</h5>
                            <p class="card-text">Create and manage user engagement quests</p>
                        </div>
                    </div>
                </a>
            </div>

            <!-- Image Moderation -->
            <div class="col-md-6 col-lg-3">
                <a href="image_set.php" class="nav-link">
                    <div class="card dashboard-card">
                        <div class="card-body text-center">
                            <i class="bi bi-image-fill card-icon"></i>
                            <h5 class="card-title">Image Moderation</h5>
                            <p class="card-text">Review and moderate uploaded images</p>
                        </div>
                    </div>
                </a>
            </div>
        </div>

        <div class="row mt-5">
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <h5 class="card-title mb-4">Quick Tips</h5>
                        <div class="row">
                            <div class="col-md-6">
                                <ul class="list-unstyled">
                                    <li class="mb-3">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Regularly review community posts to maintain content quality
                                    </li>
                                    <li class="mb-3">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Keep educational content up-to-date and accurate
                                    </li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <ul class="list-unstyled">
                                    <li class="mb-3">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Monitor uploaded images for inappropriate content
                                    </li>
                                    <li class="mb-3">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Create engaging quests to boost user participation
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
