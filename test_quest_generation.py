#!/usr/bin/env python3
"""
Test script for the quest generation endpoints
Run this script to test the new quest generation functionality
"""

import requests
import json
import time

# Backend URL
BASE_URL = "http://127.0.0.1:5000"

def test_quest_generation():
    """Test the quest generation endpoints"""
    
    print("🧪 Testing Quest Generation Endpoints")
    print("=" * 50)
    
    # Test 1: Check current quest count and auto-generate if needed
    print("\n1️⃣ Testing automatic quest check and generation...")
    try:
        response = requests.get(f"{BASE_URL}/quests/check-and-generate")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Current count: {data.get('current_count', 0)}")
            print(f"   Generated: {data.get('generated_count', 0)}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("   Make sure your Flask backend is running on port 5000")
        return
    
    # Test 2: Manual quest generation
    print("\n2️⃣ Testing manual quest generation...")
    try:
        payload = {
            "min_quests": 3,
            "quests_to_generate": 5
        }
        response = requests.post(
            f"{BASE_URL}/quests/generate",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Current count: {data.get('current_count', 0)}")
            print(f"   Generated: {data.get('generated_count', 0)}")
            
            # Show sample generated quests
            if 'quests' in data and data['quests']:
                print("\n📋 Sample Generated Quests:")
                for i, quest in enumerate(data['quests'][:3], 1):
                    print(f"   {i}. {quest['title']}")
                    print(f"      Points: {quest['points']} | Category: {quest['category']}")
                    print(f"      Target: {quest['target_count']} | Difficulty: {quest['difficulty_level']}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Test with different parameters
    print("\n3️⃣ Testing with different parameters...")
    try:
        payload = {
            "min_quests": 20,  # High threshold to force generation
            "quests_to_generate": 3
        }
        response = requests.post(
            f"{BASE_URL}/quests/generate",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"   Current count: {data.get('current_count', 0)}")
            print(f"   Generated: {data.get('generated_count', 0)}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n🎉 Quest generation testing completed!")
    print("\n📚 Available Endpoints:")
    print("   GET  /quests/check-and-generate - Auto-check and generate if needed")
    print("   POST /quests/generate - Manual quest generation with parameters")

def test_health_check():
    """Test if the backend is running"""
    print("🏥 Testing backend health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Make sure to run: python app.py")
        return False

if __name__ == "__main__":
    print("🚀 Quest Generation Test Suite")
    print("=" * 50)
    
    # First check if backend is running
    if test_health_check():
        print()
        test_quest_generation()
    else:
        print("\n💡 To start the backend, run:")
        print("   cd backend")
        print("   python app.py")
        print("\n   Then run this test script again.")
