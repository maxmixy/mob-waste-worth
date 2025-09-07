# Upload Web Files to Hostinger

## Problem
The web endpoints are returning 404 errors because the files haven't been uploaded to your hosting site yet.

## Solution
You need to upload the files from the `web/` directory to your Hostinger hosting site.

## Files to Upload
Upload these files to your hosting site's public directory (usually `public_html/` or `htdocs/`):

### Required Files:
- `web/user_profile_image.php` → `public_html/user_profile_image.php`
- `web/upload_image.php` → `public_html/upload_image.php`
- `web/list_images.php` → `public_html/list_images.php`
- `web/.htaccess` → `public_html/.htaccess`
- `web/uploads/` directory → `public_html/uploads/`

### Optional Files (for testing):
- `web/index.html` → `public_html/index.html`
- `web/test_api.html` → `public_html/test_api.html`
- `web/gallery.html` → `public_html/gallery.html`
- `web/test_upload.html` → `public_html/test_upload.html`
- `web/README.md` → `public_html/README.md`

## Upload Methods

### Method 1: File Manager (Recommended)
1. Log into your Hostinger control panel
2. Go to File Manager
3. Navigate to `public_html/`
4. Create a `web/` directory if it doesn't exist
5. Upload all files from the local `web/` directory

### Method 2: FTP
1. Use an FTP client (FileZilla, WinSCP, etc.)
2. Connect to your hosting site
3. Navigate to `public_html/`
4. Create `web/` directory
5. Upload all files

### Method 3: ZIP Upload
1. Create a ZIP file of the `web/` directory contents
2. Upload via File Manager
3. Extract in `public_html/`

## Directory Structure After Upload
```
public_html/
├── .htaccess
├── user_profile_image.php
├── upload_image.php
├── list_images.php
├── index.html
├── test_api.html
├── gallery.html
├── test_upload.html
├── README.md
└── uploads/
    └── profile_images/
```

## Testing After Upload
1. Visit: `https://red-goat-592690.hostingersite.com/`
2. Should show the index page instead of 404
3. Test API: `https://red-goat-592690.hostingersite.com/test_api.html`

## Important Notes
- Make sure the `uploads/profile_images/` directory has write permissions (755 or 777)
- The `.htaccess` file is crucial for URL rewriting
- All PHP files need to be uploaded for the API to work

## Current Status
✅ Files uploaded successfully - API working
✅ Files ready locally in `web/` directory
✅ API endpoints responding correctly
✅ Image upload system ready for use
