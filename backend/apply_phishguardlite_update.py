#!/usr/bin/env python3
"""
Script to apply updates to PhishGuard Lite files
"""

API_BASE = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod"

def update_file(filepath: str):
    """Update a file with the new API base URL"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Replace old API references
        updated = content.replace("ysnpbaet5e", "YOUR_API_ID")
        updated = updated.replace("us-east-1", "YOUR_REGION")
        
        # Update specific patterns
        updated = updated.replace("apiBaseEl.value", 'apiBaseEl.value').replace("= s.apiBase", '= s.apiBase ?? "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod"')
        
        # Add default API base constant
        if 'const DEFAULT_API_BASE' not in updated:
            updated = 'const DEFAULT_API_BASE = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod";\n' + updated
        
        # Write updated content
        with open(filepath, 'w') as f:
            f.write(updated)
            
        print(f"✅ Updated {filepath}")
        
    except Exception as e:
        print(f"❌ Error updating {filepath}: {e}")

def main():
    """Main update function"""
    files_to_update = [
        "extension/src/options/index.ts",
        "extension/src/background.ts",
        "extension/src/content.ts"
    ]
    
    print("🔄 Updating PhishGuard Lite files...")
    
    for filepath in files_to_update:
        update_file(filepath)
    
    print("✅ Update complete! Remember to:")
    print("1. Replace YOUR_API_ID with your actual API Gateway ID")
    print("2. Replace YOUR_REGION with your AWS region")
    print("3. Rebuild the extension: npm run build")

if __name__ == "__main__":
    main()
