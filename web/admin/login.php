<?php
session_start();

// If already logged in, redirect to index
if (isset($_SESSION['user_token'])) {
    header('Location: index.php');
    exit();
}

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['token'])) {
    // Store the token in session
    $_SESSION['user_token'] = $_POST['token'];
    
    // Make a request to verify admin status
    $firebaseConfig = array(
        "apiKey" => "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
        "projectId" => "waste-to-worth-7d5b0"
    );
    
    // Verify ID token using Firebase Identity Toolkit (accounts:lookup)
    // This avoids calling Firestore directly from the server without proper service account credentials.
    $idToken = $_POST['token'];
    $lookupUrl = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={$firebaseConfig['apiKey']}";

    $payload = json_encode(['idToken' => $idToken]);

    $ch = curl_init($lookupUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $email = isset($data['users'][0]['email']) ? $data['users'][0]['email'] : null;

        // Load admin whitelist from `admins.php` (maintainable list)
        $admin_emails = [];
        $admins_file = __DIR__ . '/admins.php';
        if (file_exists($admins_file)) {
            $loaded = include $admins_file;
            if (is_array($loaded)) {
                $admin_emails = $loaded;
            }
        }

    // Normalize email and whitelist entries for case-insensitive comparison
    $email_normalized = $email ? strtolower(trim($email)) : null;
    $admin_emails = array_map(function($e) { return strtolower(trim($e)); }, $admin_emails);

    if ($email_normalized && in_array($email_normalized, $admin_emails)) {
            // Authenticated and email is whitelisted as admin
            header('Location: index.php');
            exit();
        } else {
            // Token valid but not an admin
            session_destroy();
            header('Location: login.php?error=not_admin');
            exit();
        }
    } else {
        // Token invalid or lookup failed - make the error more specific
        session_destroy();
        if (in_array($httpCode, [400, 401, 403])) {
            header('Location: login.php?error=invalid_token');
        } else {
            header('Location: login.php?error=lookup_failed');
        }
        exit();
    }
}

// Firebase configuration for client-side
$firebaseConfig = array(
    "apiKey" => "AIzaSyCxj-RNwupirseU_-mGR7LtsLGA86P_GVM",
    "authDomain" => "waste-to-worth-7d5b0.firebaseapp.com",
    "projectId" => "waste-to-worth-7d5b0",
    "storageBucket" => "waste-to-worth-7d5b0.firebasestorage.app",
    "messagingSenderId" => "648267234726",
    "appId" => "1:648267234726:web:3e70721145557b2f316367",
    "measurementId" => "G-E8563BL8PJ"
);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Waste to Worth</title>
    <!-- Firebase App (the core Firebase SDK) -->
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    <!-- Firebase Auth -->
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
    <!-- Firebase Firestore -->
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .login-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #333;
        }
        input[type="email"],
        input[type="password"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        .login-button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        .login-button:hover {
            background-color: #45a049;
        }
        .error-message {
            color: #ff0000;
            margin-bottom: 10px;
            display: none;
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
    <div class="login-container">
        <h2>Admin Login</h2>
        <div id="error-message" class="error-message"></div>
        <form id="loginForm" onsubmit="return false;">
            <div class="form-group">
                <label for="username">Email Address:</label>
                <input type="email" id="username" name="username" required placeholder="Enter your admin email">
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-button" onclick="login()">Login</button>
        </form>
    </div>

    <script>
        // Initialize Firebase
        const firebaseConfig = <?php echo json_encode($firebaseConfig); ?>;
        firebase.initializeApp(firebaseConfig);

        // Show server-side error messages if present
        (function showServerError() {
            const params = new URLSearchParams(window.location.search);
            const err = params.get('error');
            if (!err) return;
            const el = document.getElementById('error-message');
            el.style.display = 'block';
            switch (err) {
                case 'not_admin':
                    el.textContent = 'Your account is not configured as an admin.';
                    break;
                case 'invalid_token':
                    el.textContent = 'Authentication token invalid. Please sign in again.';
                    break;
                case 'lookup_failed':
                    el.textContent = 'Authentication service unavailable. Try again later.';
                    break;
                default:
                    el.textContent = 'Authentication failed. Please try again.';
            }
        })();

        // Login function
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            console.log('Login attempt with username:', username);

            try {
                // First try to sign in with email and password
                const signInResult = await firebase.auth().signInWithEmailAndPassword(username, password);
                console.log('Signed in successfully:', signInResult.user.email);

                // Get the ID token
                const idToken = await signInResult.user.getIdToken();
                console.log('Got ID token');

                // Store the token and create session
                localStorage.setItem('userToken', idToken);
                
                // Create a form to submit the token to PHP
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'login.php';
                
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'token';
                tokenInput.value = idToken;
                
                form.appendChild(tokenInput);
                document.body.appendChild(form);
                form.submit();

            } catch (error) {
                // Handle errors
                console.error('Login error:', error);
                errorMessage.style.display = 'block';
                
                if (error.message === 'not-admin') {
                    errorMessage.textContent = 'This account does not have admin privileges.';
                } else {
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage.textContent = 'Invalid credentials.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage.textContent = 'Invalid credentials.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage.textContent = 'Invalid email format.';
                            break;
                        default:
                            errorMessage.textContent = 'Login failed. Please try again.';
                    }
                }
            }
        }

        // Check if user is already logged in with admin privileges
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('error')) {  // Only check if we're not already showing an error
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user && localStorage.getItem('userToken')) {
                    // User is signed in and has a token, they should be redirected by PHP
                    // Don't redirect here to avoid loops
                }
            });
        }
    </script>
</body>
</html>
