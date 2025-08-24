
<?php
// upload.php
// Minimal image upload endpoint for mobile app
// - Accepts multipart/form-data with field name: "image"
// - Saves file to ./uploads/ and returns JSON { success: true, filename, size }
// - Returns appropriate JSON errors otherwise

header('Content-Type: application/json');
// Allow CORS for development; restrict in production
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$maxFileSize = 8 * 1024 * 1024; // 8 MB
$uploadField = 'image';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Invalid method, POST required.']);
  exit;
}

if (!isset($_FILES[$uploadField])) {
  http_response_code(400);
  echo json_encode(['error' => 'No image file uploaded. Use multipart/form-data with field name "image".']);
  exit;
}

$file = $_FILES[$uploadField];
if ($file['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['error' => 'Upload error', 'code' => $file['error']]);
  exit;
}

if ($file['size'] > $maxFileSize) {
  http_response_code(400);
  echo json_encode(['error' => 'File too large', 'max' => $maxFileSize]);
  exit;
}

// Basic MIME check (allow common image types)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!in_array($mime, $allowed, true)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid file type', 'mime' => $mime]);
  exit;
}

// Read file into memory instead of saving it to disk
$imageData = file_get_contents($file['tmp_name']);
if ($imageData === false) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to read uploaded file.']);
  exit;
}

$base64Image = base64_encode($imageData);

<script type="text/javascript">
    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    const contents = [
    {
        inlineData: {
        mimeType: "image/jpeg",
        data: $base64Image,
        },
    },
    { text: "Identify the recycling material or disposable object in this image." },
    ];

    const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    });
    console.log(response.text);
</script>

// Return success without saving the file
http_response_code(200);
echo json_encode([
  'success' => true,
  'originalName' => $file['name'],
  'size' => $file['size'],
  'mime' => $mime,
  'note' => 'File processed in memory; not saved to disk'
], JSON_UNESCAPED_SLASHES);
exit;
?>