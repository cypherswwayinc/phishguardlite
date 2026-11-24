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
  'clipped': 'High Risk', 'late-direct': 'Caution', 'late-nested': 'Caution', 'late-href': 'Caution', 'compose-link': null,
};

async function badges(page) {
  return page.$$eval('a[id]', as => Object.fromEntries(as.map(a => {
    const w = a.nextElementSibling; const ok = w && w.classList.contains('pg-wrap');
    return [a.id, ok ? w.querySelector('.pg-badge').textContent : null];
  })));
}
// Toolbar icon text of every open tab, read from inside the extension's service worker.
async function toolbarTexts(sw) {
  return sw.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return Promise.all(tabs.map(async (t) => await chrome.action.getBadgeText({ tabId: t.id })));
  });
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

  check('welcome page opens by itself on first install', ctx.pages().some(p => p.url().endsWith('/welcome.html')), ctx.pages().map(p => p.url()).join(' | '));
  compare('badges match expectations (static + dynamically inserted links)', await badges(page));

  const style = await page.$eval('#shortener + .pg-wrap .pg-badge', b => { const s = getComputedStyle(b); return { bg: s.backgroundColor, display: s.display }; }).catch(() => null);
  check('badge is styled under strict CSP (caution = amber)', !!style && style.bg === 'rgb(255, 243, 205)' && style.display === 'inline-block', JSON.stringify(style));

  await page.hover('#redir-bad + .pg-wrap .pg-badge');
  const tip = await page.$eval('.pg-float .pg-tooltip', t => ({ shown: getComputedStyle(t).display === 'block', text: t.innerText })).catch(() => ({ shown: false, text: '' }));
  check('tooltip shows reasons + real destination of a redirect link', tip.shown && /secure-paypa1\.tk/.test(tip.text) && /Imitates|Look-alike/.test(tip.text), JSON.stringify(tip));

  // Short email in a clipping container (Gmail's message body): the whole tooltip must stay visible.
  await page.hover('#clipped + .pg-wrap .pg-badge');
  const clip = await page.evaluate(() => {
    const host = document.querySelector('.pg-float'); if (!host) return null;
    const t = host.getBoundingClientRect(), box = document.getElementById('clip-box').getBoundingClientRect(), b = document.querySelector('#clipped + .pg-wrap .pg-badge').getBoundingClientRect();
    let clippedBy = null; for (let e = host.parentElement; e && e !== document.documentElement; e = e.parentElement) if (getComputedStyle(e).overflow !== 'visible') clippedBy = e.id || e.tagName;
    return { belowBox: t.bottom > box.bottom + 20, underBadge: Math.abs(t.top - b.bottom) < 12 && Math.abs(t.left - b.left) < 4, inViewport: t.top >= 0 && t.left >= 0 && t.right <= innerWidth && t.bottom <= innerHeight, clippedBy, text: host.innerText, count: document.querySelectorAll('.pg-float').length };
  });
  check('tooltip is not clipped inside a short email (floats above the page)', !!clip && clip.belowBox && clip.underBadge && clip.inViewport && clip.clippedBy === null && /Goes to/.test(clip.text) && clip.count === 1, JSON.stringify(clip));
  await page.mouse.move(5, 5); await page.waitForTimeout(150);
  check('tooltip closes when the pointer leaves', await page.evaluate(() => document.querySelectorAll('.pg-float').length === 0));

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
    check('toolbar icon says "off" while detection is disabled', (await toolbarTexts(sw)).includes('off'), JSON.stringify(await toolbarTexts(sw)));
    await opts.check('#enabled'); await opts.click('#save'); await page.waitForTimeout(700);
    compare('re-enabling restores badges', await badges(page));
    await opts.close();

    // --- Toolbar icon: number of flagged links, green tick when the page is clear ---
    const flagged = Object.values(await badges(page)).filter(v => v !== null).length;
    const texts = await toolbarTexts(sw);
    check('toolbar icon shows how many links were flagged on the Gmail page', texts.includes(String(flagged)), `expected ${flagged}, tabs show ${JSON.stringify(texts)}`);
    const clear = await ctx.newPage();
    await clear.route('https://www.linkedin.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title><a href="https://www.cyphersway.com/">Our site</a>' }));
    await clear.goto('https://www.linkedin.com/feed/');
    await clear.waitForTimeout(1500);
    check('toolbar icon shows a green tick when nothing is flagged', (await toolbarTexts(sw)).includes('\u2713'), JSON.stringify(await toolbarTexts(sw)));
    await clear.close();

    // --- Every Outlook on the web address runs the extension; an unrelated site does not ---
    for (const origin of ['https://outlook.office.com', 'https://outlook.office365.com', 'https://outlook.live.com', 'https://outlook.cloud.microsoft']) {
      const p = await ctx.newPage();
      await p.route(`${origin}/**`, r => r.fulfill({ status: 200, contentType: 'text/html', body: fixture }));
      await p.goto(`${origin}/mail/`);
      await p.waitForTimeout(1800);
      const got = await badges(p);
      check(`runs on ${origin}`, got['redir-bad'] === 'High Risk' && got['shortener'] === 'Caution', JSON.stringify(got));
      await p.close();
    }
    const other = await ctx.newPage();
    await other.route('https://example.org/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: fixture }));
    await other.goto('https://example.org/');
    await other.waitForTimeout(1500);
    check('does not run on unrelated sites', Object.values(await badges(other)).every(v => v === null));
    await other.close();

    // --- Welcome page: real badges on example links, examples never navigate ---
    const wel = await ctx.newPage();
    await wel.goto(`chrome-extension://${id}/welcome.html`);
    await wel.waitForTimeout(600);
    const wb = await wel.$$eval('a[data-demo]', as => as.map(a => { const w = a.nextElementSibling; return w && w.classList.contains('pg-wrap') ? w.querySelector('.pg-badge').textContent : null; }));
    check('welcome page: 2 Caution + 1 High Risk badge, none on the safe link', JSON.stringify(wb) === JSON.stringify(['Caution', 'High Risk', 'Caution', null]), JSON.stringify(wb));
    check('welcome page: safe-link note is shown', await wel.$eval('[data-safe-note]', n => !n.hidden));
    await wel.hover('a[data-demo] + .pg-wrap .pg-badge');
    const wtip = await wel.$eval('.pg-float .pg-tooltip', t => t.innerText).catch(() => '');
    check('welcome page: tooltip explains the flag', /Canada Post/.test(wtip) && /Goes to/.test(wtip), wtip);
    await wel.mouse.move(5, 5);
    await wel.click('a[data-demo]');
    check('welcome page: example links do not open', wel.url().endsWith('/welcome.html'), wel.url());
    if (process.env.PG_SHOT) await wel.screenshot({ path: process.env.PG_SHOT, fullPage: true });
    await wel.close();
  }
  await ctx.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('E2E crashed:', e.message); process.exit(2); });
