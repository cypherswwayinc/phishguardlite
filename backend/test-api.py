#!/usr/bin/env python3
"""
Test script for PhishGuard API
"""

import requests
import json

# API base URL
BASE_URL = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod"

def test_health():
    """Test the health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_score():
    """Test the scoring endpoint"""
    print("\nTesting /score endpoint...")
    data = {
        "url": "https://example.com/test",
        "linkText": "Click here"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_report():
    """Test the reporting endpoint"""
    print("\nTesting /report endpoint...")
    data = {
        "url": "https://suspicious-site.com",
        "context": {
            "pageUrl": "https://example.com",
            "reasons": ["High-risk TLD", "Suspicious domain"]
        }
    }
    try:
        response = requests.post(f"{BASE_URL}/report", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("PhishGuard API Test Script")
    print("=" * 40)
    
    # Test all endpoints
    health_ok = test_health()
    score_ok = test_score()
    report_ok = test_report()
    
    print("\n" + "=" * 40)
    print("Test Results:")
    print(f"Health: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Score:  {'✅ PASS' if score_ok else '❌ FAIL'}")
    print(f"Report: {'✅ PASS' if report_ok else '❌ FAIL'}")
    
    if not any([health_ok, score_ok, report_ok]):
        print("\n⚠️  All tests failed. The API may require authentication.")
        print("Check the API Gateway configuration in the AWS Console.")
