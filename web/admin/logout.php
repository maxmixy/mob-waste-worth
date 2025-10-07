<?php
session_start();

// Clear session data
$_SESSION = [];

// Destroy session cookie
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'], $params['secure'], $params['httponly']
    );
}

// Destroy the session
@session_destroy();

// Server-side redirect fallback in case JS is unavailable
$redirectUrl = 'login.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Logging out…</title>
    <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f9fa} .card{background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.08);text-align:center}</style>
    <script>
        // Try to sign out from Firebase client if available, then redirect to login.php
        function goToLogin() {
            window.location = '<?php echo $redirectUrl; ?>';
        }

        (function(){
            if (window.firebase && firebase.auth && typeof firebase.auth === 'function') {
                try {
                    firebase.auth().signOut().then(goToLogin).catch(goToLogin);
                    // add short timeout fallback
                    setTimeout(goToLogin, 3000);
                } catch(e) {
                    goToLogin();
                }
            } else {
                // No Firebase loaded; redirect immediately
                goToLogin();
            }
        })();
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0;url=<?php echo $redirectUrl; ?>">
    </noscript>
</head>
<body>
    <div class="card">
        <h2>Signing out…</h2>
        <p>If you are not redirected automatically, <a href="<?php echo $redirectUrl; ?>">click here</a>.</p>
    </div>
</body>
</html>
