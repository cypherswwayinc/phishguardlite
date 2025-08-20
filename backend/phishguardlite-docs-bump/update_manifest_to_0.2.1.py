#!/usr/bin/env python3
import json, sys
from pathlib import Path

VERSION = "0.2.1"

def bump_manifest(manifest_path: Path):
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    old = data.get("version")
    data["version"] = VERSION
    manifest_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"[manifest] {manifest_path} : {old} -> {VERSION}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 update_manifest_to_0.2.1.py /path/to/repo")
        sys.exit(1)
    repo = Path(sys.argv[1]).resolve()
    manifest = repo / "extension" / "manifest.json"
    if not manifest.exists():
        print(f"manifest not found: {manifest}")
        sys.exit(2)
    bump_manifest(manifest)
    print("Done. Commit and tag as v0.2.1 when ready.")

if __name__ == "__main__":
    main()
