// UI-level verification for the Worker module.
// Usage: node verify_ui.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SRC = './src/index.js';
const TMP = './.verify-tmp.mjs';

execFileSync(process.execPath, ['--check', SRC], { stdio: 'inherit' });
console.log('PASS  node --check src/index.js');

writeFileSync(TMP, readFileSync(SRC, 'utf8'), 'utf8');
const mod = await import(TMP + '?t=' + Date.now());
if (existsSync(TMP)) unlinkSync(TMP);

const worker = mod.default;

const BIN_ID = 'a8f29c41';
const SALT = 'deadbeefdeadbeefdeadbeefdeadbeef';
const TOKEN_HASH = createHash('sha256').update(SALT + ':CorrectHorse2026').digest('hex');
const SESSION = createHash('sha256').update('session:' + TOKEN_HASH).digest('hex');

function mockDb(hasBin) {
  const row = hasBin ? { id: BIN_ID, salt: SALT, token_hash: TOKEN_HASH } : null;
  return {
    prepare() {
      const shape = (known) => ({
        first: async () => (known ? row : null),
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { last_row_id: 1 } })
      });
      return Object.assign(shape(hasBin), {
        bind: (...args) => shape(hasBin && args[0] === BIN_ID)
      });
    }
  };
}
const ctx = { waitUntil() {} };

async function call(path, headers) {
  const res = await worker.fetch(new Request('https://inspector.dev' + path, { headers: headers || {} }), { DB: mockDb(true) }, ctx);
  return { status: res.status, body: await res.text() };
}

const home = await call('/');
const view = await call('/view/' + BIN_ID, { Cookie: 'wh_' + BIN_ID + '=' + SESSION });
const locked = await call('/view/' + BIN_ID);
const missing = await call('/view/nope-not-real');

const checks = [];
const expect = (name, cond) => { checks.push([name, !!cond]); };

expect('home returns 200', home.status === 200);
expect('view returns 200 with a session', view.status === 200);
expect('brand arrows logo present', home.body.includes('M6 8h13') && home.body.includes('m14 12 4 4-4 4'));
expect('dashboard brand arrows present', view.body.includes('M6 8h13'));
expect('view injects binId', view.body.includes(BIN_ID));
expect('view injects hook url', view.body.includes('/hook/' + BIN_ID));
expect('no unresolved ${binId} placeholder', !view.body.includes('${binId}'));
expect('no unresolved ${hookUrl} placeholder', !view.body.includes('${hookUrl}'));
expect('client newline escape intact', view.body.includes("split('\\n')"));
expect('client whitespace regex intact', view.body.includes('replace(/\\s+/g'));
expect('client local-time helper present', view.body.includes('function fmtDateTime'));
expect('client template literal intact', view.body.includes('class="msg-row ${active}"'));
expect('no shadow on home chrome', !home.body.includes('box-shadow'));
expect('showcase window removed', !home.body.includes('showcase-window'));
expect('hero eyebrow removed', !home.body.includes('\u5f00\u53d1\u8005\u4e8b\u4ef6\u4e2d\u67a2'));
expect('hero lead paragraph removed', !home.body.includes('\u96f6\u914d\u7f6e\u5f00\u901a\u4e13\u5c5e\u63a5\u6536\u7aef\u70b9'));

// --- 首页：去掉锚点、主标题一行 ---
expect('top nav has no anchor links', !home.body.includes('nav-link') && !home.body.includes('>\u6838\u5fc3\u80fd\u529b</a>'));
expect('hero title is a single line', home.body.includes('\u900f\u89c6\u6bcf\u4e00\u6b21\u56de\u8c03\uff0c\u8fde\u63a5\u6bcf\u4e00\u4e2a\u5de5\u4f5c\u6d41\u3002'));
expect('hero title carries no forced break', !home.body.includes('\u900f\u89c6\u6bcf\u4e00\u6b21\u56de\u8c03\u3002<br>'));

// --- 控制台：注销端点 ---
expect('console offers a destroy button', view.body.includes('\u6ce8\u9500\u7aef\u70b9'));
expect('destroy button is wired up', view.body.includes('onclick="destroyEndpoint()"'));
expect('destroy requires two confirmations', (view.body.match(/confirm\(/g) || []).length >= 4,
       'confirms=' + (view.body.match(/confirm\(/g) || []).length);
expect('destroy posts to the destroy route', view.body.includes("'/api/' + BIN_ID + '/destroy'"));
expect('destroy drops the cached token', view.body.includes("removeItem('wh_token_' + BIN_ID)"));

// --- 控制台：新推送渠道 ---
const channels = ['wecom', 'dingtalk', 'feishu', 'telegram', 'discord', 'slack', 'ntfy', 'bark', 'gotify', 'serverchan', 'raw'];
const absentChannels = channels.filter(c => !view.body.includes("['" + c + "', '"));
expect('channel list covers every platform', absentChannels.length === 0, 'missing=' + absentChannels.join(','));
expect('channels keep their three groups',
       ['\u7fa4\u673a\u5668\u4eba', '\u63a8\u9001\u6e20\u9053', '\u901a\u7528'].every(g => view.body.includes("['" + g + "', [")));
expect('presets cover every channel', channels.every(c => view.body.includes('  ' + c + ': { url:')));
expect('labels come from one source', view.body.includes('FORWARD_LABELS[f.forward_type]') && !view.body.includes('const typeLabels'));
expect('platform switch updates the hint', view.body.includes('syncForwarderHint()'));
expect('url hint element exists', view.body.includes('id="f-hint"'));

// --- 自定义下拉：原生 select 的面板无法套用设计规范 ---
expect('native select replaced', !view.body.includes('<select class="form-control" id="f-type"') &&
       !view.body.includes('<optgroup'));
expect('hidden field keeps the old contract', view.body.includes('<input type="hidden" id="f-type"'));
expect('trigger advertises a listbox', view.body.includes('aria-haspopup="listbox"') && view.body.includes('aria-expanded="false"'));
expect('panel uses listbox semantics', view.body.includes("panel.setAttribute('role', 'listbox')") &&
       view.body.includes("role=\"option\"") && view.body.includes("aria-selected="));
expect('panel escapes the modal clipping',
       view.body.includes('document.body.appendChild(panel)') && view.body.includes('position: fixed'));
expect('panel flips when there is no room', view.body.includes('const flip ='));
expect('keyboard navigation implemented',
       ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Enter'].every(k => view.body.includes(k)) &&
       view.body.includes('onPickerKey'));
expect('type-ahead implemented', view.body.includes('pickerTyped'));
expect('outside click closes the panel', view.body.includes('onPickerOutside'));
expect('hint styling exists on the console', view.body.includes('.form-hint {'));

// 规范禁止给界面加投影：全页只允许接收队列绿点那一处状态光晕
const shadows = (view.body.match(/box-shadow/g) || []).length;
expect('no UI shadows anywhere on the console', shadows === 1, 'box-shadow count=' + shadows);

// --- access control: disclaimer modal on home ---
expect('create modal exists on home', home.body.includes('id="create-modal"'));
expect('modal carries a disclaimer', home.body.includes('\u514d\u8d23\u58f0\u660e'));
expect('modal warns about the password', home.body.includes('\u8bf7\u52a1\u5fc5\u4fdd\u62a4\u597d\u4f60\u7684\u5bc6\u7801\u4e0e\u63a8\u9001\u4ee4\u724c'));
expect('modal warns about leaking the endpoint', home.body.includes('\u6cc4\u9732'));
expect('modal documents the query token form', home.body.includes('?token='));
expect('modal documents the header token form', home.body.includes('X-Webhook-Token'));
expect('modal asks for a password', home.body.includes('id="pwd"') && home.body.includes('type="password"'));
expect('modal asks to confirm the password', home.body.includes('id="pwd2"'));
expect('modal requires agreement', home.body.includes('id="agree"') && home.body.includes('type="checkbox"'));
expect('nav CTA opens the modal', home.body.includes('onclick="openCreate()"'));
expect('both CTAs open the modal', (home.body.match(/onclick="openCreate\(\)"/g) || []).length >= 2,
       'found ' + (home.body.match(/onclick="openCreate\(\)"/g) || []).length);
expect('creation has exactly one submit path', (home.body.match(/action="\/api\/new"/g) || []).length === 1,
       'found ' + (home.body.match(/action="\/api\/new"/g) || []).length);


// --- 首页：已有端点入口 ---
expect('nav offers the existing-endpoint entry', home.body.includes('\u5df2\u6709\u7aef\u70b9'));
expect('existing-endpoint entry opens the finder', home.body.includes('onclick="openFind()"'));
expect('nav groups the two actions', home.body.includes('class="nav-actions"'));
expect('nav keeps the primary create cta', home.body.includes('class="nav-cta"') && home.body.includes('onclick="openCreate()"'));
expect('finder modal exists', home.body.includes('id="find-modal"'));
expect('finder modal is compact', home.body.includes('sheet is-compact'));
expect('finder modal announces itself', home.body.includes('role="dialog"') && home.body.includes('aria-labelledby="find-title"'));
expect('finder has an id field', home.body.includes('id="find-id"'));
expect('finder documents the hook path', home.body.includes('hint-code') && home.body.includes('/hook/'));
expect('finder has an error slot', home.body.includes('id="find-err"'));
expect('finder can be cancelled', home.body.includes('onclick="closeFind()"'));
expect('finder submits through the lookup', home.body.includes('onsubmit="return openExistingEndpoint()"'));
expect('finder parses hook and view urls', home.body.includes('(?:hook|view)') && home.body.includes('[A-Za-z0-9_-]'));
expect('finder queries the lookup route', home.body.includes("'/api/exists?id=' + encodeURIComponent(id)"));
expect('finder reports a missing endpoint', home.body.includes('\u6ca1\u6709\u6b64\u7aef\u70b9'));
expect('finder disables the button while querying', home.body.includes('\u67e5\u8be2\u4e2d'));
expect('finder restores the button after a miss', home.body.includes("btn.textContent = '\u6253\u5f00\u63a7\u5236\u53f0'"));
expect('escape closes both modals', home.body.includes("ev.key !== 'Escape'") && home.body.includes('closeCreate();') && home.body.includes('closeFind();'));
expect('backdrop click closes the finder', home.body.includes("getElementById('find-modal').addEventListener('click'"));
expect('finder stays clear of the network on open', home.body.includes('function closeFind()') && home.body.includes("classList.remove('show')"));


// --- \u5b50\u8bf7\u6c42\u9884\u7b97\uff1a\u5165\u5e93\u6536\u655b + \u8f6c\u53d1\u4e0a\u9650 ---
const bundle = readFileSync(SRC, 'utf8');
expect('ingest budget constant exists', bundle.includes('MAX_INGEST_BYTES'));
expect('forwarder ceiling constant exists', bundle.includes('MAX_FORWARDERS_PER_BIN = 10'));
expect('oversized payloads are trimmed before insert', bundle.includes('fitForStorage(rawBody)'));
expect('the insert stores the trimmed copy', bundle.includes('fitted.body'));
expect('forwarding still uses the raw payload', bundle.includes('dispatchForward(f, rawBody, binId)'));
expect('the fan-out is capped in code', bundle.includes('slice(0, MAX_FORWARDERS_PER_BIN)'));
expect('the forwarder route enforces the ceiling', bundle.includes("error: 'forwarder limit reached'"));
expect('the ceiling is published to the console', bundle.includes('limit: MAX_FORWARDERS_PER_BIN'));
expect('the truncation note is explicit', bundle.includes('[\u5df2\u622a\u65ad]'));

// --- \u63a7\u5236\u53f0\uff1a\u914d\u989d\u53ef\u89c1 ---
expect('console shows the forwarder quota', view.body.includes('id="f-quota"'));
expect('console explains the ceiling', view.body.includes('id="f-cap"'));
expect('the save button is addressable', view.body.includes('id="f-save"'));
expect('quota sync reads the published limit', view.body.includes('syncForwarderQuota(data.limit)'));
expect('the console blocks saves at the cap', view.body.includes('forwarders.length >= forwardLimit'));
expect('an API refusal is explained to the user', view.body.includes("'forwarder limit reached'"));
expect('the quota renders as N / limit', view.body.includes("forwarders.length + ' / ' + forwardLimit"));

// --- access control: locked console ---
expect('console without a session returns 401', locked.status === 401, 'status=' + locked.status);
expect('locked console renders a password form', locked.body.includes('name="password"'));
expect('locked console names the endpoint', locked.body.includes(BIN_ID));
expect('locked console never stores the hash client-side', !locked.body.includes(TOKEN_HASH));
expect('locked console never echoes the password', !locked.body.includes('CorrectHorse2026'));
expect('missing endpoint returns 404', missing.status === 404, 'status=' + missing.status);
expect('missing endpoint offers no password form', !missing.body.includes('name="password"'));

// --- the console hydrates a usable push target without printing the token ---
expect('console has a token footnote', view.body.includes('id="token-note"'));
expect('console resolves the cached token', view.body.includes("sessionStorage.getItem('wh_token_'"));
expect('console picks up the password from creation', view.body.includes("sessionStorage.getItem('wh_pending_pwd')"));
expect('console copy uses the token-bearing url', view.body.includes('const url = pushUrl();'));
expect('console bounces expired sessions to login', view.body.includes('location.href = ' + "'/view/' + BIN_ID"));
expect('console can lock itself', view.body.includes('logoutConsole'));
expect('printed push url stays token-free', !view.body.includes('/hook/' + BIN_ID + '?token='));

const latin1ish = /[\uFFFD]/u;
expect('no replacement chars (encoding sane)', !latin1ish.test(home.body) && !latin1ish.test(view.body));

const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const homeEmoji = home.body.match(emoji);
const viewEmoji = view.body.match(emoji);
expect('home has no emoji', !homeEmoji);
expect('view has no emoji', !viewEmoji);

const svgHome = (home.body.match(/<svg/g) || []).length;
const svgView = (view.body.match(/<svg/g) || []).length;
expect('home uses vector icons (>=8 svg)', svgHome >= 8);
expect('view uses vector icons (>=10 svg)', svgView >= 10);

const statsRes = await call('/api/stats');
const statsBody = JSON.parse(statsRes.body);
expect('stats endpoint answers with the declared shape',
       statsRes.status === 200 && statsBody.ok === true && statsBody.measured === 'self'
       && typeof statsBody.received === 'number' && typeof statsBody.forwarded === 'number'
       && typeof statsBody.usage.requests === 'number' && typeof statsBody.usage.d1_writes === 'number');
expect('stats publishes the free-tier ceilings',
       statsBody.limits.requests === 100000 && statsBody.limits.d1_reads === 5000000 && statsBody.limits.d1_writes === 100000);
expect('stats stamps the UTC day', /^\d{4}-\d{2}-\d{2}$/.test(statsBody.day));
expect('stats leaks no endpoint id', !statsRes.body.includes(BIN_ID));
expect('home renders the stat strip', home.body.includes('id="stat-strip"'));
expect('the strip carries four cells', (home.body.match(/class="stat-cell"/g) || []).length === 4);
expect('the strip reads /api/stats', home.body.includes("fetch('/api/stats')"));
expect('the strip names the Beijing reset hour', home.body.includes('08:00'));
expect('the strip markup is flat', !/\.stat-strip[^}]*box-shadow/.test(home.body));
expect('the quota cells render as progress bars',
       (home.body.match(/class="stat-bar"/g) || []).length === 2
       && home.body.includes('st-workers-bar') && home.body.includes('st-d1-bar'));
expect('the quota cells render a percentage, not a raw count',
       home.body.includes('renderQuota(') && !home.body.includes('fmtNum(Math.max(0'));
expect('the quota bar warns before it runs out',
       home.body.includes('is-warn') && home.body.includes('is-danger'));
expect('the quota bar is a flat capsule',
       /\.stat-bar-fill\s*\{[^}]*border-radius:\s*9999px/.test(home.body));

console.log('--- summary ---');
console.log('home svg icons: ' + svgHome + ' | view svg icons: ' + svgView);
if (homeEmoji) console.log('home emoji found: ' + JSON.stringify(homeEmoji[0]));
if (viewEmoji) console.log('view emoji found: ' + JSON.stringify(viewEmoji[0]));

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
}
console.log(failed === 0 ? 'ALL UI CHECKS PASSED (' + checks.length + ')' : failed + ' CHECK(S) FAILED');
process.exit(failed === 0 ? 0 : 1);
