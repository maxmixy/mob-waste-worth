# Unsplash API Setup Instructions

## Overview
The Waste-To-Worth app now includes Unsplash API integration to automatically fetch high-quality images for scanned materials. This helps users visualize the materials they're recycling.

## Setup Steps

### 1. Get Unsplash API Access Key
1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in to your Unsplash account
3. Create a new application
4. Copy your **Access Key** (not the Secret Key)

### 2. Configure the Backend
1. Open `w2w/backend/app.py`
2. Find line 65: `UNSPLASH_ACCESS_KEY = "YOUR_UNSPLASH_ACCESS_KEY"`
3. Replace `"YOUR_UNSPLASH_ACCESS_KEY"` with your actual access key:
   ```python
   UNSPLASH_ACCESS_KEY = "your_actual_access_key_here"
   ```

### 3. Install Required Dependencies
The `requests` library is already included in the imports. If you encounter any issues, install it:
```bash
pip install requests
```

## How It Works

### Smart Caching System
- **First scan**: When a material is scanned for the first time, the system searches Unsplash for a relevant image
- **Subsequent scans**: If the same material is scanned again, the system reuses the existing image URL
- **Database updates**: All materials with the same name get updated with the image URL

### Search Strategy
The system tries multiple search terms to find the best image:
1. `"{material_name} recycling"`
2. `"{material_name} waste"`
3. `"{material_name} material"`
4. `"{material_name}"`

### API Optimization
- **Rate limiting**: Respects Unsplash's rate limits (50 requests/hour for free tier)
- **Timeout handling**: 5-second timeout for API calls
- **Error handling**: Graceful fallback if Unsplash is unavailable
- **Caching**: Avoids duplicate API calls for the same materials

## Benefits

### For Users
- **Visual identification**: See what the material looks like
- **Better understanding**: Connect scanned items with real-world examples
- **Professional appearance**: High-quality images from Unsplash

### For Performance
- **Reduced API calls**: Smart caching prevents duplicate requests
- **Faster loading**: Images are cached in the database
- **Cost effective**: Minimal API usage through intelligent caching

## Troubleshooting

### No Images Appearing
1. Check if the Unsplash API key is correctly set
2. Verify the API key has proper permissions
3. Check the backend logs for error messages

### API Rate Limits
- Free tier: 50 requests per hour
- If you hit limits, the system will gracefully skip image fetching
- Consider upgrading to a paid plan for higher limits

### Image Quality
- Images are fetched in "regular" size for good quality/speed balance
- All images are landscape orientation for consistency
- Images are sourced from Unsplash's high-quality collection

## Example Usage

When a user scans a "plastic bottle":
1. Gemini identifies it as "plastic bottle"
2. System checks if any "plastic bottle" materials already have image URLs
3. If not, searches Unsplash for "plastic bottle recycling"
4. Finds and stores the image URL
5. Updates all "plastic bottle" materials with the same image URL
6. Future scans of "plastic bottle" will reuse the existing image URL

This ensures efficient API usage while providing rich visual content for all materials.
