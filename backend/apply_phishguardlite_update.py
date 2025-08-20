#!/usr/bin/env python3
import sys, json, re
from pathlib import Path

API_BASE = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod"

def patch_manifest(p: Path):
    if not p.exists(): print("[manifest] not found"); return
    try:
        data = json.loads(p.read_text())
    except Exception as e:
        print("[manifest] parse fail:", e); return
    data["name"] = "PhishGuard Lite"
    data["description"] = "Inline phishing risk labels and one-click reporting. Local heuristics; report only on user action."
    ver = data.get("version","0.1.0")
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)$", ver) or re.match(r"^(\d+)\.(\d+)$", ver)
    if m:
        major = int(m.group(1)); minor = int(m.group(2))
        data["version"] = f"{major}.{minor+1}.0"
    p.write_text(json.dumps(data, indent=2)); print("[manifest] updated")

def patch_options_ts(p: Path):
    if not p.exists(): print("[options] not found"); return
    s = p.read_text()
    if "DEFAULT_API_BASE" not in s:
        s = s.replace("chrome.storage.sync.get(", 'chrome.storage.sync.get(["enabled","minScore","apiBase","tenantKey","enableReporting"], ')
        s = s.replace("apiBaseEl.value", 'apiBaseEl.value').replace("= s.apiBase", '= s.apiBase ?? "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod"')
        s = s.replace("enableReportingEl.checked = s.enableReporting", "enableReportingEl.checked = (s.enableReporting ?? true)")
        s = 'const DEFAULT_API_BASE = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod";\n' + s
        p.write_text(s); print("[options] injected defaults")
    else:
        print("[options] defaults already present")

def patch_background_ts(p: Path):
    if not p.exists(): print("[background] not found"); return
    s = p.read_text()
    if "const DEFAULT_API =" not in s:
        s = 'const DEFAULT_API = "https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod";\n' + s
    s = re.sub(r"const\s+apiBase\s*=\s*\(?s\.apiBase[^;]*;", 'const apiBase = (s.apiBase || DEFAULT_API).replace(/\/$/, "");', s)
    p.write_text(s); print("[background] ensured DEFAULT_API fallback")

def ensure_file(root: Path, rel: str, content: str):
    fp = root / rel
    fp.parent.mkdir(parents=True, exist_ok=True)
    if not fp.exists():
        fp.write_text(content); print("[add]", rel)
    else:
        print("[keep]", rel)

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 apply_phishguardlite_update.py /path/to/repo"); sys.exit(1)
    root = Path(sys.argv[1]).resolve()
    patch_manifest(root/"extension"/"manifest.json")
    patch_options_ts(root/"extension"/"src"/"options"/"index.ts")
    patch_background_ts(root/"extension"/"src"/"background.ts")
    ensure_file(root, ".github/workflows/build-extension.yml", Path(__file__).with_name("proposed-changes").joinpath(".github/workflows/build-extension.yml").read_text())
    ensure_file(root, "backend/aws-sam/template.yaml", Path(__file__).with_name("proposed-changes").joinpath("backend/aws-sam/template.yaml").read_text())
    ensure_file(root, "backend/scripts/deploy-sam.md", Path(__file__).with_name("proposed-changes").joinpath("backend/scripts/deploy-sam.md").read_text())
    print("\nDone. Review changes, commit, and push:")
    print("  git add . && git commit -m 'PhishGuard: defaults, CI, SAM' && git push")

if __name__ == "__main__":
    main()
