#!/usr/bin/env python3
"""
Test script for PhishGuard Lite API endpoints
"""

import requests
import json

# Replace with your actual API Gateway URL
BASE_URL = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod"

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health Check: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return False

def test_score():
    """Test the scoring endpoint"""
    try:
        payload = {
            "url": "https://example.zip",
            "linkText": "Click here"
        }
        response = requests.post(f"{BASE_URL}/score", json=payload)
        print(f"✅ Score Test: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Score Test Failed: {e}")
        return False

def test_report():
    """Test the reporting endpoint"""
    try:
        payload = {
            "url": "https://suspicious.com",
            "tenantKey": "test-user",
            "context": {
                "linkText": "Click here",
                "pageUrl": "https://gmail.com",
                "reasons": ["High-risk TLD"]
            }
        }
        response = requests.post(f"{BASE_URL}/report", json=payload)
        print(f"✅ Report Test: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Report Test Failed: {e}")
        return False

def test_admin_summary():
    """Test the admin summary endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/admin/api/reports/summary")
        print(f"✅ Admin Summary Test: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Admin Summary Test Failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing PhishGuard Lite API...")
    print(f"🌐 Base URL: {BASE_URL}")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("URL Scoring", test_score),
        ("Report Submission", test_report),
        ("Admin Summary", test_admin_summary)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check your API configuration.")
        print("\n💡 Remember to:")
        print("1. Replace YOUR_API_ID with your actual API Gateway ID")
        print("2. Replace YOUR_REGION with your AWS region")
        print("3. Ensure your backend is deployed and running")

if __name__ == "__main__":
    main()
