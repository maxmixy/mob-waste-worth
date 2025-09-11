# Gemini API Setup Instructions

## Overview
The disposal system now uses Google's Gemini AI to generate intelligent, climate-specific disposal steps. The system includes fallback mechanisms to ensure it works even if the API is not available.

## Setup Steps

### 1. Enable the Generative Language API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (ID: 648267234726)
3. Navigate to "APIs & Services" > "Library"
4. Search for "Generative Language API"
5. Click on it and press "Enable"
6. Wait a few minutes for the API to be activated

### 2. Get an API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. Optionally restrict the key to only the Generative Language API

### 3. Configure the API Key
You can set the API key in several ways:

#### Option A: Environment Variable (Recommended)
```bash
export GEMINI_API_KEY="your-api-key-here"
```

#### Option B: Direct in Code
Update the `init_gemini()` function in `app.py`:
```python
api_key = "your-api-key-here"  # Replace with your actual key
```

### 4. Test the Integration
Run the test script to verify everything works:
```bash
python test_gemini.py
```

## Fallback System
If the Gemini API is not available or fails, the system will automatically fall back to:
- Pre-defined disposal steps based on material type
- Climate-specific considerations (tropical vs temperate)
- Basic recycling guidelines

## API Usage
The system uses the `text-bison-001` model with the following parameters:
- Temperature: 0.7 (balanced creativity/consistency)
- Max output tokens: 1024
- Model: `models/text-bison-001`

## Cost Considerations
- The Generative Language API has free tier limits
- Each disposal generation uses approximately 100-200 tokens
- Monitor usage in the Google Cloud Console

## Troubleshooting

### Common Issues:
1. **403 SERVICE_DISABLED**: Enable the Generative Language API
2. **401 UNAUTHENTICATED**: Check your API key
3. **429 QUOTA_EXCEEDED**: You've hit the rate limit

### Fallback Behavior:
- If Gemini fails, the system uses predefined steps
- All functionality continues to work
- Users won't notice the difference in most cases

## Current Status
- ✅ Gemini API integration implemented
- ✅ Fallback system in place
- ✅ Tropical climate specialization
- ⚠️ API needs to be enabled in Google Cloud Console
- ✅ Test script available
