# Chrome Web Store permissions: history and current state

## Current permissions (version 0.4.0)

```json
{
  "permissions": ["storage"],
  "host_permissions": ["https://phishguard.cyphersway.com/*"],
  "content_scripts": [{
    "matches": [
      "https://mail.google.com/*",
      "https://outlook.office.com/*",
      "https://outlook.office365.com/*",
      "https://outlook.live.com/*",
      "https://outlook.cloud.microsoft/*",
      "https://www.linkedin.com/*"
    ]
  }]
}
```

The extension does not request `activeTab`, `scripting` or access to all websites. Content scripts run only on the six addresses above. `extension/manifest.json` is the source of truth; if this file and the manifest disagree, the manifest is right.

## Why this matters for review

Chrome Web Store flagged an early build (0.2.4) for "Broad Host Permissions" because `host_permissions` contained `https://*/*`. That entry was removed, and review has not been delayed by host permissions since.

Version 0.4.0 added three Outlook on the web addresses (`outlook.office365.com`, `outlook.live.com`, `outlook.cloud.microsoft`) as content script matches. Existing users see a permission prompt when they update, and the extension may show as disabled until they click Enable.

## Changes by version

| Version | Permission change |
| --- | --- |
| 0.2.5 | Removed `https://*/*` from host permissions (this fixed the review warning) |
| 0.3.0 | Removed `activeTab` and `scripting`, which the extension did not use |
| 0.4.0 | Added three Outlook on the web addresses as content script matches |

## When a permission changes

1. Update `extension/manifest.json` and this file together.
2. Update the justification text in `CHROME_STORE_PERMISSION_JUSTIFICATIONS.md`.
3. Add a line to `CHANGELOG.md` that says plainly what the new permission is for, because existing users will be prompted.
