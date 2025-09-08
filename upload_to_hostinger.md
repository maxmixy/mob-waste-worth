# Upload Post Image PHP to Hostinger

## Manual Upload Instructions

You need to upload the `upload_post_image.php` file to your Hostinger site.

### Step 1: Access Your Hostinger File Manager
1. Log into your Hostinger control panel
2. Go to File Manager
3. Navigate to the root directory (public_html or similar)

### Step 2: Upload the File
1. Upload the file: `web/upload_post_image.php`
2. Make sure it's in the root directory (same level as your existing PHP files)
3. The file should be accessible at: `https://red-goat-592690.hostingersite.com/upload_post_image.php`

### Step 3: Test the Upload
After uploading, test with this command:
```bash
curl -I "https://red-goat-592690.hostingersite.com/upload_post_image.php"
```

You should see a response like:
```
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Alternative: Use FTP/SFTP
If you have FTP access:
1. Connect to your Hostinger FTP
2. Upload `web/upload_post_image.php` to the root directory
3. Set permissions to 644

## File Location
- **Local file**: `web/upload_post_image.php`
- **Upload to**: Hostinger root directory
- **Final URL**: `https://red-goat-592690.hostingersite.com/upload_post_image.php`

## Troubleshooting
- If you get 404: File not uploaded or wrong location
- If you get CORS errors: Check that CORS headers are present
- If you get 500 errors: Check PHP syntax and file permissions
