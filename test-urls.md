# PhishGuard Lite test URLs

> Generated from the scoring engine (`extension/src/lib/scoring.ts`) so it always matches the code.
> Regenerate after changing the rules. Automated checks live in `extension/tests/`.

How to use: paste these as links into a test email (Gmail, Outlook web) or open `extension/tests/e2e/gmail-fixture.html`.
A badge appears on links scoring at or above the **Minimum score** in Options (default 20). Hover a badge to see why.

Scores: **Safe** < 20 ≤ **Caution** < 50 ≤ **High Risk**.

## High Risk (score 50+)

| Link | Link text | Score | Why |
|---|---|---|---|
| `https://paypal.com@evil-site.top/login` | paypal.com sign in | 80 | Frequently abused TLD: .top; Username/password in the link (often used to disguise the real site); Link text domain mismatch |
| `https://paypal.com.account-verify.net/signin` |  | 50 | Imitates paypal (paypal.com.account-verify.net is not an official paypal domain) |
| `https://secure-paypa1.tk/login` | Verify your account at paypal.com | 100 | High-risk TLD: .tk; Look-alike of paypal: secure-paypa1.tk; Link text domain mismatch |
| `https://rbc-secure-login.tk/` |  | 75 | High-risk TLD: .tk; Imitates rbc (rbc-secure-login.tk is not an official rbc domain) |
| `https://www.google.com/url?q=https%3A%2F%2Fsecure-paypa1.tk%2Flogin` | Verify at paypal.com | 100 | High-risk TLD: .tk; Look-alike of paypal: secure-paypa1.tk; Link text domain mismatch (real destination: secure-paypa1.tk) |

## Caution (score 20-49)

| Link | Link text | Score | Why |
|---|---|---|---|
| `https://login.gq` |  | 40 | High-risk TLD: .gq |
| `https://account.ga` |  | 40 | High-risk TLD: .ga |
| `https://bit.ly/abc123` |  | 20 | URL shortener host |
| `https://tinyurl.com/test` |  | 20 | URL shortener host |
| `http://192.168.4.5/login` |  | 40 | Link points to a raw IP address; Not using HTTPS |
| `https://example.com/login@secure-bank` |  | 20 | Contains '@' in the path |
| `https://arnazon.com/login` |  | 35 | Look-alike of amazon: arnazon.com |
| `https://gооgle.com/login` |  | 25 | Punycode/homoglyph in hostname |
| `https://paypal-secure-login.com/` |  | 35 | Imitates paypal (paypal-secure-login.com is not an official paypal domain) |
| `https://nam02.safelinks.protection.outlook.com/?url=https%3A%2F%2Fl...` |  | 40 | High-risk TLD: .gq (real destination: login.gq) |

## Safe (no badge)

| Link | Link text | Score | Why |
|---|---|---|---|
| `https://google.com` |  | 0 | - |
| `https://www.google.ca/` |  | 0 | - |
| `https://www.amazon.ca/deals` |  | 0 | - |
| `https://github.com` |  | 0 | - |
| `https://stackoverflow.com` |  | 0 | - |
| `https://login.microsoftonline.com/common/oauth2` |  | 0 | - |
| `https://onedrive.live.com/?id=1` |  | 0 | - |
| `https://www.rbcroyalbank.com/personal.html` |  | 0 | - |
| `https://www.canadapost-postescanada.ca/track` |  | 0 | - |
| `https://files.example.com/a1b2` | Download invoice.pdf | 0 | - |
| `https://www.google.com/url?q=https%3A%2F%2Fwww.cyphersway.com%2F` | Our website | 0 | - (real destination: www.cyphersway.com) |

## Notes

- Redirect wrappers (Google `/url?q=`, Microsoft Safe Links, LinkedIn, Facebook) are unwrapped; the real destination is scored.
- Links inside email compose/reply boxes are never modified.
- Brand checks cover common targets (PayPal, Microsoft, Google, Amazon, Apple, major Canadian banks and Canada Post, ...). Genuine country domains (amazon.ca, google.com.au) are not flagged.
