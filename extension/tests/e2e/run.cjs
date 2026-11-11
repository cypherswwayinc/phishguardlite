// End-to-end test: loads the built extension in real Chromium and checks it against a Gmail-like page.
// Usage: node tests/e2e/run.cjs <extension-dir> [--expect-broken]
// Requires: playwright (+ its Chromium). The page is served at https://mail.google.com via request interception.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = require('playwright');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

const extDir = path.resolve(process.argv[2] || 'dist');
const fixture = fs.readFileSync(path.join(__dirname, 'gmail-fixture.html'), 'utf8');
const results = []; const check = (name, ok, detail='') => { results.push({name, ok}); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };

const EXPECT = { // id -> expected badge label (null = no badge)
  'redir-bad': 'High Risk', 'shortener': 'Caution', 'legit-ca': null, 'userinfo': 'High Risk',
  'legit-google': null, 'ip-host': 'Caution', 'brand-sub': 'High Risk', 'file-link': null,
  'hash-link': null, 'mail-link': null, 'safelink': 'Caution',
  'late-direct': 'Caution', 'late-nested': 'Caution', 'late-href': 'Caution', 'compose-link': null,
};

async function badges(page) {
  return page.$$eval('a[id]', as => Object.fromEntries(as.map(a => {
    const w = a.nextElementSibling; const ok = w && w.classList.contains('pg-wrap');
    return [a.id, ok ? w.querySelector('.pg-badge').textContent : null];
  })));
}
function compare(label, got) {
  const bad = Object.entries(EXPECT).filter(([id, exp]) => (got[id] ?? null) !== exp).map(([id, exp]) => `${id}: expected ${exp}, got ${got[id] ?? null}`);
  check(label, bad.length === 0, bad.join('; '));
}

(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'pg-')), {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  let reported = null;
  await ctx.route('https://phishguard.cyphersway.com/**', async route => {
    reported = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: {'access-control-allow-origin':'*'}, body: JSON.stringify({ ok: true, message: 'stored', reportId: 'test-1' }) });
  });
  const page = await ctx.newPage();
  // Strict CSP like Gmail's: no inline styles allowed. The badge must still be styled (CSS comes from the manifest).
  await page.route('https://mail.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/html',
    headers: { 'content-security-policy': "script-src 'unsafe-inline'; style-src 'self'; connect-src 'self'" }, body: fixture }));
  await page.goto('https://mail.google.com/mail/u/0/#inbox');
  await page.waitForTimeout(4500);

  compare('badges match expectations (static + dynamically inserted links)', await badges(page));

  const style = await page.$eval('#shortener + .pg-wrap .pg-badge', b => { const s = getComputedStyle(b); return { bg: s.backgroundColor, display: s.display }; }).catch(() => null);
  check('badge is styled under strict CSP (caution = amber)', !!style && style.bg === 'rgb(255, 243, 205)' && style.display === 'inline-block', JSON.stringify(style));

  await page.hover('#redir-bad + .pg-wrap .pg-badge');
  const tip = await page.$eval('#redir-bad + .pg-wrap .pg-tooltip', t => ({ shown: getComputedStyle(t).display === 'block', text: t.innerText }));
  check('tooltip shows reasons + real destination of a redirect link', tip.shown && /secure-paypa1\.tk/.test(tip.text) && /Imitates|Look-alike/.test(tip.text), JSON.stringify(tip));

  const composeSafe = await page.evaluate(() => document.getElementById('compose').innerHTML === window.__composeInitial);
  check('compose window (contenteditable) is left untouched', composeSafe);

  await page.click('#shortener + .pg-wrap .pg-report-btn');
  await page.waitForFunction(() => /Reported|Error/.test(document.querySelector('#shortener + .pg-wrap .pg-report-btn').textContent), null, { timeout: 8000 }).catch(() => {});
  const btn = await page.$eval('#shortener + .pg-wrap .pg-report-btn', b => b.textContent);
  check('Report works on Gmail via background worker', btn === 'Reported ✓', `button="${btn}"`);
  check('report payload: destination URL, origin-only page, reasons', !!reported && reported.url === 'https://bit.ly/abc123' && reported.context?.pageUrl === 'https://mail.google.com' && Array.isArray(reported.context?.reasons) && reported.context.reasons.length > 0, JSON.stringify(reported));

  // Live settings: change them in the options page, the open mail tab must update without a reload.
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker').catch(() => null);
  if (!sw) { check('extension service worker is running', false, 'no service worker'); }
  else {
    const id = new URL(sw.url()).host;
    const opts = await ctx.newPage();
    await opts.goto(`chrome-extension://${id}/index.html`);
    await opts.fill('#minScore', '60'); await opts.click('#save'); await page.waitForTimeout(700);
    const hi = await badges(page);
    check('raising minimum score to 60 hides Caution badges live, keeps High Risk', hi['shortener'] === null && hi['redir-bad'] === 'High Risk', JSON.stringify(hi));
    await opts.fill('#minScore', '20'); await opts.uncheck('#enabled'); await opts.click('#save'); await page.waitForTimeout(700);
    check('disabling detection removes all badges live', Object.values(await badges(page)).every(v => v === null));
    await opts.check('#enabled'); await opts.click('#save'); await page.waitForTimeout(700);
    compare('re-enabling restores badges', await badges(page));
    await opts.close();
  }
  await ctx.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('E2E crashed:', e.message); process.exit(2); });
