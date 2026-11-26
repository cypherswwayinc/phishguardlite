# Chrome Web Store permission justifications: PhishGuard Lite

These match `extension/manifest.json` at version 0.4.0. The extension requests one API permission (`storage`) and runs on six addresses. It does not request `activeTab`, `scripting` or access to all websites. If the manifest changes, change this file in the same commit.

Each field in the Web Store dashboard allows 1,000 characters. The text below is under that.

---

## storage

```
PhishGuard Lite saves the user's settings in the browser: whether detection is on, the minimum score at which a link gets a badge, whether the Report button is shown, and the optional organisation key for the Business plan. Nothing from the user's email, browsing or links is stored with this permission.
```

---

## Host permissions and content scripts

The extension adds warning badges next to links on these pages only:

- `https://mail.google.com/*` (Gmail)
- `https://outlook.office.com/*`, `https://outlook.office365.com/*`, `https://outlook.live.com/*`, `https://outlook.cloud.microsoft/*` (Outlook on the web: work, school and personal accounts)
- `https://www.linkedin.com/*` (LinkedIn)

```
PhishGuard Lite checks where each link in Gmail, Outlook on the web and LinkedIn really goes and puts a Caution or High Risk badge next to risky ones. To do that it must read the links on those pages, so it runs on Gmail, the four Outlook on the web addresses (work, school and personal accounts) and LinkedIn, and nowhere else. The checks run in the browser. Email content is never sent to a server.
```

## Report service host permission

`https://phishguard.cyphersway.com/*`

```
This address receives a report only when the user clicks the Report button on a flagged link. A report holds the flagged link, the reasons it was flagged and the name of the site it was seen on (for example mail.google.com). It does not contain the email, the sender or the page address. Nothing is sent unless the user clicks Report.
```

---

## Single purpose

```
PhishGuard Lite helps people spot phishing links in Gmail, Outlook on the web and LinkedIn by labelling risky links with a warning badge and a plain-language reason.
```

## Remote code

```
No. All code ships inside the extension package. The extension does not load or run code from a server.
```

---

## How to use these

1. Open the extension in the Chrome Web Store developer dashboard, then the Privacy tab.
2. Paste each block into the field with the matching name.
3. Do not paste text for permissions the manifest does not list. A justification for a permission that is not requested can trigger a review question.
