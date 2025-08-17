# 🧪 PhishGuard Lite Extension Test URLs

## 🔴 High Risk URLs (Score ≥50)

### High-risk TLDs:
- `https://login.gq` - .gq TLD (Central African Republic)
- `https://bank.cf` - .cf TLD (Central African Republic)  
- `https://secure.tk` - .tk TLD (Tokelau)
- `https://pay.ml` - .ml TLD (Mali)
- `https://account.ga` - .ga TLD (Gabon)

### Punycode attacks:
- `https://xn--google-45g.com` - Homoglyph attack
- `https://xn--facebok-7fb.com` - Fake Facebook

## 🟡 Caution URLs (Score 20-49)

### URL Shorteners:
- `https://bit.ly/abc123` - Bit.ly shortener
- `https://t.co/xyz` - Twitter shortener
- `https://tinyurl.com/test` - TinyURL shortener

### Long URLs:
- `https://example.com/very-long-path-that-exceeds-150-characters-to-trigger-the-scoring-algorithm-and-show-how-the-extension-detects-suspiciously-long-urls-that-might-be-used-for-phishing-attacks`

### Email obfuscation:
- `https://example.com/login@secure-bank` - Contains @ in path

## 🟢 Safe URLs (Score 0-19)

### Standard domains:
- `https://google.com` - Standard domain
- `https://github.com` - Standard domain
- `https://example.org` - Standard TLD
- `https://stackoverflow.com` - Standard domain

## 📋 Testing Instructions

1. **Load the extension** in Chrome/Edge using `extension/dist` folder
2. **Visit each URL** to see the extension analyze them
3. **Look for colored badges** next to suspicious links
4. **Hover over badges** to see risk explanations
5. **Check browser console** for scoring details

## 🔍 What to Expect

- **Red badges** appear next to high-risk URLs
- **Yellow badges** appear next to caution URLs
- **No badges** on safe URLs
- **Tooltips** show specific risk factors
- **Real-time analysis** on every page load

## 🎯 Test Scenarios

1. **News websites** - Lots of external links to analyze
2. **Social media** - URL shorteners and external content
3. **Blogs** - External references and citations
4. **Email clients** - Potential phishing attempts
5. **Search results** - Various domain types and TLDs

The extension will automatically scan all links and highlight suspicious ones with visual indicators!
