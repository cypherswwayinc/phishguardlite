#!/usr/bin/env python3
"""
Test specific phishing detection scenarios against the PhishGuard Lite API
"""

import requests
import json

# Replace with your actual API Gateway URL
BASE_URL = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod"

def test_scenario(url, link_text, expected_score_range, description):
    """Test a specific URL scoring scenario"""
    try:
        payload = {
            "url": url,
            "linkText": link_text
        }
        
        response = requests.post(f"{BASE_URL}/score", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            score = data.get('score', 0)
            reasons = data.get('reasons', [])
            label = data.get('label', 'Unknown')
            
            # Check if score is in expected range
            min_score, max_score = expected_score_range
            score_ok = min_score <= score <= max_score
            
            status = "✅ PASS" if score_ok else "❌ FAIL"
            print(f"{status} {description}")
            print(f"   URL: {url}")
            print(f"   Score: {score} (Expected: {min_score}-{max_score})")
            print(f"   Label: {label}")
            print(f"   Reasons: {reasons}")
            print()
            
            return score_ok
        else:
            print(f"❌ FAIL {description}")
            print(f"   HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
            print()
            return False
            
    except Exception as e:
        print(f"❌ FAIL {description}")
        print(f"   Exception: {e}")
        print()
        return False

def main():
    """Run all test scenarios"""
    print("🧪 Testing PhishGuard Lite - Specific Scenarios")
    print(f"🌐 Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Define test scenarios
    scenarios = [
        # High-risk TLDs (should score 40+)
        ("https://example.zip", "Click here", (35, 45), "High-risk TLD (.zip)"),
        ("https://suspicious.mov", "Download", (35, 45), "High-risk TLD (.mov)"),
        ("https://phishing.gq", "Visit site", (35, 45), "High-risk TLD (.gq)"),
        ("https://malware.cf", "Click here", (35, 45), "High-risk TLD (.cf)"),
        
        # URL shorteners (should score 20+)
        ("https://bit.ly/suspicious", "Short link", (15, 25), "URL shortener (bit.ly)"),
        ("https://t.co/malware", "Twitter link", (15, 25), "URL shortener (t.co)"),
        ("https://tinyurl.com/phishing", "Tiny link", (15, 25), "URL shortener (tinyurl)"),
        
        # Lookalike domains (should score 35+)
        ("https://g00gle.com", "Google", (30, 40), "Lookalike domain (g00gle)"),
        ("https://paypa1.com", "PayPal", (30, 40), "Lookalike domain (paypa1)"),
        ("https://faceb00k.com", "Facebook", (30, 40), "Lookalike domain (faceb00k)"),
        
        # Email obfuscation (should score 20+)
        ("https://evil.com/account@secure-login", "Login", (15, 25), "Email obfuscation (@ in path)"),
        ("https://phishing.com/user@admin-panel", "Admin", (15, 25), "Email obfuscation (@ in path)"),
        
        # Very long URLs (should score 10+)
        ("https://suspicious.com/very-long-path-that-exceeds-the-normal-length-limits-and-should-trigger-the-length-detection-logic-because-it-is-much-longer-than-150-characters-which-is-the-threshold-for-very-long-urls", "Long link", (5, 15), "Very long URL path"),
        
        # Safe domains (should score 0-19)
        ("https://google.com", "Google", (0, 19), "Safe domain (google.com)"),
        ("https://github.com", "GitHub", (0, 19), "Safe domain (github.com)"),
        ("https://stackoverflow.com", "Stack Overflow", (0, 19), "Safe domain (stackoverflow)"),
        ("https://paypal.com", "PayPal", (0, 19), "Safe domain (paypal.com)")
    ]
    
    print("🔍 Running test scenarios...\n")
    
    results = []
    for url, link_text, expected_range, description in scenarios:
        result = test_scenario(url, link_text, expected_range, description)
        results.append((description, result))
    
    print("=" * 60)
    print("📊 Test Results Summary:")
    
    passed = 0
    total = len(results)
    
    for description, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {description}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your phishing detection is working correctly.")
    else:
        print("⚠️  Some tests failed. Check your scoring algorithm.")
    
    print("\n💡 Remember to:")
    print("1. Replace YOUR_API_ID with your actual API Gateway ID")
    print("2. Replace YOUR_REGION with your AWS region")
    print("3. Ensure your backend is deployed and running")
    print("4. Check the scoring logic in your backend code")

if __name__ == "__main__":
    main()
