process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const EXT = '/home/claude/phishguardlite/extension/dist';
const OUT = __dirname, PREVIEW = process.argv.includes('--preview');
const VERT = process.argv.includes('--vertical'), SUF = VERT ? '-v' : '';
const FPS = 30, W = VERT ? 450 : 800, H = VERT ? 800 : 450, DSF = 2.4, SCALE = VERT ? '1080:1920' : '1920:1080';
const mail = fs.readFileSync(path.join(OUT, 'mail.html'), 'utf8'), card = fs.readFileSync(path.join(OUT, 'card.html'), 'utf8');
const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;

function encoder(name) {
  name += SUF; const tmp = path.join(OUT, name + '.part.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `scale=${SCALE}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  let n = 0;
  return { write: async (buf, times = 1) => { for (let i = 0; i < times; i++) { n++; if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); } },
    done: () => new Promise((res, rej) => { ff.on('exit', c => { if (c === 0) { fs.renameSync(tmp, path.join(OUT, name + '.mp4')); res(n); } else rej(new Error('ffmpeg ' + c)); }); ff.stdin.end(); }) };
}

(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'pgv-')), {
    channel: 'chromium', headless: true, viewport: { width: W, height: H }, deviceScaleFactor: DSF,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  await ctx.route('https://phishguard.cyphersway.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true,"reportId":"demo"}' }));
  const page = await ctx.newPage();
  await page.route('https://mail.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'content-security-policy': "script-src 'unsafe-inline'; style-src 'self'" }, body: mail }));
  const shot = () => page.screenshot({ type: 'jpeg', quality: 92 });

  // ---------- card scenes ----------
  const cards = {
    intro: { cls: '', html: '<div class="brand">PhishGuard Lite</div><h1>The link says PayPal.<br>The address says paypa1.</h1><p>One wrong click is all a phishing email needs.</p>', secs: 3.0 },
    privacy: { cls: 'dark', html: '<h2>Checked inside your browser.<br>Your emails never leave it.</h2><p>Works in Gmail, Outlook on the web and LinkedIn.</p>', secs: 4.3 },
    end: { cls: 'dark', html: '<div class="brand">PhishGuard Lite</div><div class="row"><div class="col"><h3>Free for Chrome</h3><p>Warnings on risky links, for anyone.</p></div><div class="col"><h3>Business plan</h3><p>Your whole team covered, with reported links reviewed by CypherSway. $29 CAD a month.</p></div></div><div><span class="url">cyphersway.com/phishguard</span></div><div class="foot">Made by CypherSway Inc.</div>', secs: 11.7 },
  };
  const cpage = await ctx.newPage(); await cpage.setContent(card);
  for (const [name, c] of Object.entries(cards)) {
    await cpage.evaluate(([c, v]) => { document.body.className = c.cls + (v ? ' v' : ''); document.documentElement.className = v ? 'v' : ''; document.body.innerHTML = v ? c.html.replace('<br>The address', ' The address').replace('<br>Your emails', ' Your emails') : c.html; }, [c, VERT]);
    await cpage.waitForTimeout(150);
    await cpage.screenshot({ path: path.join(OUT, name + SUF + '.png') });
    if (PREVIEW) continue;
    const tmp = path.join(OUT, name + SUF + '.part.mp4');
    await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(OUT, name + SUF + '.png'),
      '-vf', `scale=${SCALE}:flags=lanczos,format=yuv420p,loop=-1:1,trim=duration=${c.secs},fade=t=in:st=0:d=0.4,fade=t=out:st=${c.secs - 0.4}:d=0.4`,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], { stdio: 'inherit' }).on('exit', x => x === 0 ? (fs.renameSync(tmp, path.join(OUT, name + SUF + '.mp4')), res()) : rej(new Error('ffmpeg'))));
  }
  await cpage.close();
  if (process.argv.includes('--cards-only')) { await ctx.close(); return; }

  // ---------- demo scene (real extension) ----------
  await page.goto('https://mail.google.com/mail/u/0/#inbox');
  await page.waitForSelector('#lnk + .pg-wrap .pg-badge', { timeout: 15000 });
  const box = async sel => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  if (VERT) await page.evaluate(() => window.setVertical());
  await page.waitForTimeout(400);
  let cur = VERT ? { x: 330, y: 560 } : { x: 640, y: 330 };
  const link = await box('#lnk'), badge = await box('#lnk + .pg-wrap .pg-badge'), report = await box('#lnk + .pg-wrap .pg-report-btn');
  const place = async p => { cur = p; await page.mouse.move(p.x, p.y); await page.evaluate(p => window.setCur(p.x, p.y), p); };
  const cap = t => page.evaluate(t => window.setCap(t), t);
  await place(cur);

  if (PREVIEW) {
    await cap('The link says paypal.com.'); await page.screenshot({ path: path.join(OUT, 'p1'+SUF+'.jpg'), type: 'jpeg', quality: 92 });
    await place(badge); await page.waitForTimeout(200); await cap('Hover to see why, and where it really goes.'); await page.screenshot({ path: path.join(OUT, 'p2'+SUF+'.jpg'), type: 'jpeg', quality: 92 });
    await place(report); await page.mouse.click(report.x, report.y); await page.waitForTimeout(600); await cap('One click reports it.'); await page.screenshot({ path: path.join(OUT, 'p3'+SUF+'.jpg'), type: 'jpeg', quality: 92 });
    await ctx.close(); return;
  }

  const enc = encoder('demo');
  // Timeline follows the narration. Times are seconds from the start of this scene (video time minus 3.0).
  let written = 0;
  const put = async (times = 1) => { await enc.write(await shot(), times); written += times; };
  const until = async t => { const n = Math.round(t * FPS) - written; if (n > 0) await put(n); };
  const glide = async (to, secs) => { const from = { ...cur }, n = Math.round(secs * FPS);
    for (let i = 1; i <= n; i++) { const t = ease(i / n); await place({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }); await put(); } };

  await cap('Phishing emails rely on one trick: a link can say anything.'); await until(4.3);
  await cap('This one says paypal.com.'); await glide({ x: link.x, y: link.y + 2 }, 1.0); await until(6.6);
  await cap('PhishGuard Lite checks where every link really goes, and flags the risky ones before you click.'); await until(9.6);
  await glide({ x: badge.x + 4, y: badge.y + 30 }, 0.7); await until(11.9);        // points at the badge, not on it yet
  await cap('Hover over the badge to see why.'); await until(12.1);
  await glide(badge, 0.4); await page.waitForTimeout(250); await until(14.0);      // tooltip opens
  await cap('The real address is paypa1, a look-alike.'); await until(17.5);
  await cap('If something looks wrong, one click reports it.'); await until(17.8);
  await glide(report, 0.6); await until(18.8);
  await page.mouse.click(report.x, report.y);
  await page.waitForFunction(() => /Reported/.test(document.querySelector('#lnk + .pg-wrap .pg-report-btn').textContent), null, { timeout: 8000 });
  await put();
  await glide(VERT ? { x: report.x + 20, y: report.y + 40 } : { x: report.x + 46, y: report.y + 34 }, 0.4);
  await until(20.2);
  console.log('demo frames', await enc.done());
  await ctx.close();
})().catch(e => { console.error(e); process.exit(1); });
