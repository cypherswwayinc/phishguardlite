#!/usr/bin/env python3
"""
Test specific phishing detection scenarios with PhishGuard API
"""

import requests
import json

# API base URL
BASE_URL = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod"

def test_safe_url():
    """Test a safe URL"""
    print("Testing safe URL: https://google.com")
    data = {
        "url": "https://google.com",
        "linkText": "Google Search"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        result = response.json()
        print(f"Score: {result['score']}, Label: {result['label']}")
        print(f"Reasons: {result['reasons']}")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_high_risk_tld():
    """Test a URL with high-risk TLD"""
    print("\nTesting high-risk TLD: https://suspicious-site.gq")
    data = {
        "url": "https://suspicious-site.gq",
        "linkText": "Click here"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        result = response.json()
        print(f"Score: {result['score']}, Label: {result['label']}")
        print(f"Reasons: {result['reasons']}")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_url_shortener():
    """Test a URL shortener"""
    print("\nTesting URL shortener: https://bit.ly/example")
    data = {
        "url": "https://bit.ly/example",
        "linkText": "Download here"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        result = response.json()
        print(f"Score: {result['score']}, Label: {result['label']}")
        print(f"Reasons: {result['reasons']}")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_domain_mismatch():
    """Test link text domain mismatch"""
    print("\nTesting domain mismatch: URL is google.com but text says 'PayPal'")
    data = {
        "url": "https://google.com",
        "linkText": "PayPal - Click to verify your account"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        result = response.json()
        print(f"Score: {result['score']}, Label: {result['label']}")
        print(f"Reasons: {result['reasons']}")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_long_url():
    """Test a very long URL"""
    print("\nTesting long URL with many parameters")
    long_url = "https://example.com/very/long/path/with/many/parameters?param1=value1&param2=value2&param3=value3&param4=value4&param5=value5&param6=value6&param7=value7&param8=value8&param9=value9&param10=value10&param11=value11&param12=value12&param13=value13&param14=value14&param15=value15"
    data = {
        "url": long_url,
        "linkText": "Click here"
    }
    try:
        response = requests.post(f"{BASE_URL}/score", json=data)
        result = response.json()
        print(f"Score: {result['score']}, Label: {result['label']}")
        print(f"Reasons: {result['reasons']}")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("PhishGuard API - Specific Scenario Tests")
    print("=" * 50)
    
    # Test various scenarios
    test_safe_url()
    test_high_risk_tld()
    test_url_shortener()
    test_domain_mismatch()
    test_long_url()
    
    print("\n" + "=" * 50)
    print("All specific scenario tests completed!")
