// ======================= 访问控制工具 =======================
// 数据库只保存 加盐 SHA-256 哈希，不保存明文密码。
// 同一个密码承担两个角色：Web 控制台登录口令 + 推送令牌。

const TEXT_ENCODER = new TextEncoder();
const MIN_PASSWORD_LENGTH = 8;
const SESSION_MAX_AGE = 43200; // 12 小时
// 留量：D1 单行上限 2 MB，报文原文直接入库，先按 1 MB 收敛（含 headers 也远低于 2 MB）
const MAX_INGEST_BYTES = 1024 * 1024;
const MAX_INGEST_CHARS = 256 * 1024;
// 免费版每次调用只有 50 个子请求（硬上限），本函数已占用 5 次 D1，转发规则必须封顶
const MAX_FORWARDERS_PER_BIN = 10;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', TEXT_ENCODER.encode(text));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteLength) {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashPassword(salt, password) {
  return sha256Hex(salt + ':' + password);
}

function sessionTokenFor(tokenHash) {
  return sha256Hex('session:' + tokenHash);
}

function cookieNameFor(binId) {
  return 'wh_' + binId;
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

function buildCookie(name, value, url, maxAgeSeconds) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAgeSeconds + secure;
}

function htmlResponse(html, status) {
  return new Response(html, {
    status: status || 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function isConsoleAuthenticated(request, binId, bin) {
  if (!bin || !bin.token_hash) return false;
  const provided = readCookie(request, cookieNameFor(binId));
  if (!provided) return false;
  return provided === await sessionTokenFor(bin.token_hash);
}

// 推送请求里的令牌不写进报文记录，避免在控制台明文回显
function redactQuery(search) {
  if (!search || search.length < 2) return search || '';
  const params = new URLSearchParams(search);
  if (params.has('token')) params.set('token', '***');
  const rest = params.toString();
  return rest ? '?' + rest : '';
}

function redactHeaders(headersObj) {
  const REDACTED = ['x-webhook-token', 'authorization'];
  const clean = {};
  for (const key of Object.keys(headersObj)) {
    clean[key] = REDACTED.includes(key.toLowerCase()) ? '***' : headersObj[key];
  }
  return clean;
}

const PAGE_SHELL_CSS = [
  ':root{--primary:#0066cc;--primary-hover:#0071e3;--ink:#1d1d1f;--ink-muted:#86868b;',
  '--canvas:#ffffff;--canvas-parchment:#f5f5f7;--hairline:#d2d2d7;--hairline-soft:#e5e5ea;',
  '--font-display:"SF Pro Display",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;',
  '--font-text:"SF Pro Text",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{background:var(--canvas-parchment);color:var(--ink);font-family:var(--font-text);-webkit-font-smoothing:antialiased;',
  'min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}',
  '.nav{position:fixed;top:0;left:0;right:0;height:48px;background:rgba(255,255,255,.82);',
  'backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);',
  'border-bottom:1px solid var(--hairline-soft);display:flex;align-items:center;padding:0 24px;gap:8px}',
  '.nav a{font-family:var(--font-display);font-size:15px;font-weight:600;letter-spacing:-.2px;color:var(--ink);',
  'text-decoration:none;display:flex;align-items:center;gap:8px}',
  '.card{background:var(--canvas);border:1px solid var(--hairline-soft);border-radius:18px;padding:36px 32px;',
  'width:100%;max-width:420px;text-align:center}',
  '.icon{width:56px;height:56px;border-radius:50%;background:var(--canvas-parchment);display:inline-flex;',
  'align-items:center;justify-content:center;color:var(--primary);margin-bottom:18px}',
  'h1{font-family:var(--font-display);font-size:21px;font-weight:600;letter-spacing:-.2px;margin-bottom:8px}',
  'p{font-size:14px;line-height:1.5;color:var(--ink-muted)}',
  '.bin{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--primary);',
  'background:var(--canvas-parchment);border:1px solid var(--hairline-soft);border-radius:9999px;padding:3px 12px;',
  'display:inline-block;margin-top:16px;margin-bottom:6px}',
  '.field{width:100%;background:var(--canvas-parchment);border:1px solid var(--hairline);border-radius:8px;',
  'padding:11px 14px;font-family:var(--font-text);font-size:15px;color:var(--ink);outline:none;margin-top:20px;text-align:center}',
  '.field:focus{background:#fff;border-color:var(--primary)}',
  '.btn{display:block;width:100%;margin-top:14px;background:var(--primary);color:#fff;border:none;border-radius:9999px;',
  'padding:12px 22px;font-family:var(--font-text);font-size:15px;cursor:pointer;text-decoration:none;text-align:center;',
  'transition:background .15s}',
  '.btn:hover{background:var(--primary-hover)}',
  '.err{margin-top:14px;font-size:13px;color:#c5221f;background:#fce8e6;border:1px solid #f8d0cd;',
  'border-radius:8px;padding:9px 12px}'
].join('');

function brandMark() {
  return '<div class="nav"><a href="/">' +
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#0066cc">' +
    '<path d="M6 8h13"/><path d="m10 4-4 4 4 4"/><path d="M18 16H5"/><path d="m14 12 4 4-4 4"/></svg>' +
    '<span>Webhook Inspector</span></a></div>';
}

function lockedIcon() {
  return '<div class="icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>';
}

function loginPage(binId, errorText) {
  const err = errorText ? '<div class="err">' + errorText + '</div>' : '';
  const remember = "try{sessionStorage.setItem('wh_token_" + binId + "',document.getElementById('p').value)}catch(e){}";
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>控制台登录 — Webhook Inspector</title>' +
    '<style>' + PAGE_SHELL_CSS + '</style></head><body>' + brandMark() +
    '<div class="card">' + lockedIcon() +
    '<h1>需要密码才能查看</h1>' +
    '<p>该端点已启用访问保护，请输入创建时设置的密码。</p>' +
    '<div class="bin">' + binId + '</div>' +
    '<form method="POST" action="/api/' + binId + '/login" onsubmit="' + remember + '">' +
    '<input class="field" id="p" name="password" type="password" placeholder="请输入访问密码" autocomplete="current-password" autofocus required>' +
    '<button class="btn" type="submit">进入控制台</button>' +
    '</form>' + err +
    '</div></body></html>';
}

function errorPage(message) {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>端点不可用 — Webhook Inspector</title>' +
    '<style>' + PAGE_SHELL_CSS + '</style></head><body>' + brandMark() +
    '<div class="card">' + lockedIcon() +
    '<h1>端点不可用</h1><p>' + message + '</p>' +
    '<a class="btn" href="/">返回首页重新创建</a>' +
    '</div></body></html>';
}

// ======================= 协同消息格式适配器 =======================
const FORWARD_TITLE = 'Webhook 事件通知';

// 各渠道都有自己的长度上限，超出部分截断并显式标注，避免对方接口直接报 400
function clip(text, limit) {
  const s = String(text == null ? '' : text);
  if (s.length <= limit) return s;
  return s.slice(0, limit) + '\n…（已截断，完整报文请在控制台查看）';
}

// 入库前的体积收敛：D1 单行上限 2 MB，放任超限会让 INSERT 直接失败、推送方收到 500。
// 按 UTF-8 字节数截断并回退到完整字符边界，避免留下半个多字节字符。
function fitForStorage(text) {
  const s = String(text == null ? '' : text);
  if (s.length <= MAX_INGEST_CHARS) return { body: s, truncated: false, originalBytes: 0 };
  const enc = TEXT_ENCODER.encode(s);
  if (enc.length <= MAX_INGEST_BYTES) return { body: s, truncated: false, originalBytes: enc.length };
  let cut = enc.slice(0, MAX_INGEST_BYTES);
  while (cut.length && (cut[cut.length - 1] & 0xC0) === 0x80) cut = cut.subarray(0, cut.length - 1);
  if (cut.length && cut[cut.length - 1] >= 0xC0) cut = cut.subarray(0, cut.length - 1);
  return {
    body: new TextDecoder().decode(cut) +
      '\n\n[已截断] 原始报文 ' + enc.length + ' 字节，超过入库上限 ' + MAX_INGEST_BYTES +
      ' 字节，此处保留前 ' + cut.length + ' 字节。',
    truncated: true,
    originalBytes: enc.length
  };
}

function forwardContext(binId, name) {
  return '接收端点: ' + binId + '\n规则名称: ' + name;
}

// Telegram 的 chat_id 通常写在目标地址的查询参数里
function chatIdFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).searchParams.get('chat_id') || '';
  } catch (err) {
    return '';
  }
}

async function dispatchForward(forwarder, rawBody, binId) {
  const { target_url, forward_type, name } = forwarder;
  const body = String(rawBody == null ? '' : rawBody);
  const context = forwardContext(binId, name);
  let payloadBody = body;
  let headers = { 'Content-Type': 'application/json; charset=utf-8' };

  try {
    if (forward_type === 'wecom') {
      payloadBody = JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content: `### ${FORWARD_TITLE}\n> 接收端点: \`${binId}\`\n> 规则名称: **${name}**\n\`\`\`json\n${clip(body, 3600)}\n\`\`\``
        }
      });
    } else if (forward_type === 'dingtalk') {
      payloadBody = JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: FORWARD_TITLE,
          text: `### ${FORWARD_TITLE}\n\n- 接收端点: \`${binId}\`\n- 规则名称: **${name}**\n\n\`\`\`json\n${clip(body, 3600)}\n\`\`\``
        }
      });
    } else if (forward_type === 'feishu') {
      payloadBody = JSON.stringify({
        msg_type: 'interactive',
        card: {
          header: { title: { tag: 'plain_text', content: FORWARD_TITLE } },
          elements: [
            { tag: 'div', text: { tag: 'lark_md', content: `**接收端点**: \`${binId}\` | **规则名称**: ${name}` } },
            { tag: 'div', text: { tag: 'lark_md', content: `\`\`\`json\n${clip(body, 2600)}\n\`\`\`` } }
          ]
        }
      });
    } else if (forward_type === 'telegram') {
      const chatId = chatIdFromUrl(target_url);
      payloadBody = JSON.stringify({
        chat_id: chatId || undefined,
        text: `【${FORWARD_TITLE}】\n${context}\n\n${clip(body, 3400)}`,
        disable_web_page_preview: true
      });
    } else if (forward_type === 'discord') {
      payloadBody = JSON.stringify({
        content: `**${FORWARD_TITLE}**\n${context}\n\`\`\`json\n${clip(body, 1600)}\n\`\`\``
      });
    } else if (forward_type === 'slack') {
      payloadBody = JSON.stringify({
        text: `*${FORWARD_TITLE}*\n${context}\n\`\`\`\n${clip(body, 2600)}\n\`\`\``
      });
    } else if (forward_type === 'ntfy') {
      // 标题走请求头，保持 ASCII 避免不同服务端对非 ASCII 头部的解析差异
      headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Title': 'Webhook Inspector',
        'Tags': 'incoming_envelope'
      };
      payloadBody = `【${FORWARD_TITLE}】\n${context}\n\n${clip(body, 3600)}`;
    } else if (forward_type === 'bark') {
      payloadBody = JSON.stringify({ title: FORWARD_TITLE, body: body, group: name });
    } else if (forward_type === 'gotify') {
      payloadBody = JSON.stringify({ title: FORWARD_TITLE, message: clip(body, 30000), priority: 5 });
    } else if (forward_type === 'serverchan') {
      headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' };
      payloadBody = 'title=' + encodeURIComponent(FORWARD_TITLE) +
        '&desp=' + encodeURIComponent(context + '\n\n' + clip(body, 30000));
    }

    const resp = await fetch(target_url, { method: 'POST', headers: headers, body: payloadBody });
    const respText = await resp.text();
    return { log: `[${name}] HTTP ${resp.status}: ${respText.slice(0, 100)}`, ok: resp.ok };
  } catch (err) {
    return { log: `[${name}] 发送异常: ${err.message}`, ok: false };
  }
}

// ======================= 用量统计（自计） =======================
// Cloudflare 不向 Worker 暴露账号级用量，所以自计一份，口径与免费额度一致（按 UTC 日重置）：
// 每次请求累加 1 次请求数，并把本次请求内所有 D1 语句返回的 meta.rows_read / rows_written 累加，
// 收尾时用原始 DB 一次性落库——每次请求只多花 1 次写入。
function newUsage() {
  return { requests: 0, reads: 0, writes: 0, received: 0, forwarded: 0 };
}

function instrumentDb(db, usage) {
  const handler = {
    get(stmt, prop) {
      const value = stmt[prop];
      if (typeof value !== 'function') return value;
      if (prop === 'bind') return (...args) => new Proxy(stmt.bind(...args), handler);
      // first() / raw() 不返回 meta，按「至少读了 1 行」估算，其余照抄 D1 给的元数据
      if (prop === 'first' || prop === 'raw') {
        return (...args) => value.apply(stmt, args).then((res) => {
          usage.reads += 1;
          return res;
        });
      }
      if (prop === 'run' || prop === 'all') {
        return (...args) => value.apply(stmt, args).then((res) => {
          if (res && res.meta) {
            usage.reads += Number(res.meta.rows_read || 0);
            usage.writes += Number(res.meta.rows_written || 0);
          }
          return res;
        });
      }
      return value.bind(stmt);
    }
  };
  return {
    prepare: (sql) => new Proxy(db.prepare(sql), handler),
    batch: (stmts) => db.batch(stmts),
    exec: (sql) => db.exec(sql)
  };
}

// 结算节流：逐请求落库的话，光控制台 2.5 秒一次的轮询就能把 D1 免费写入额度（10 万行/天）
// 吃掉一大半。改为在 isolate 内存里攒批，最多 20 秒写一次；收到消息时立刻结算。
const FLUSH_INTERVAL_MS = 20000;
let pendingUsage = newUsage();
let pendingDay = '';
let lastFlushAt = 0;

function foldUsage(usage, day) {
  pendingUsage.requests += usage.requests;
  pendingUsage.reads += usage.reads;
  pendingUsage.writes += usage.writes;
  pendingUsage.received += usage.received;
  pendingDay = day || pendingDay;
}

function flushDue(force) {
  return !!force || (Date.now() - lastFlushAt) >= FLUSH_INTERVAL_MS;
}

function flushUsage(db) {
  if (!pendingUsage.requests && !pendingUsage.reads && !pendingUsage.writes && !pendingUsage.received) {
    return Promise.resolve();
  }
  const snapshot = pendingUsage;
  const day = pendingDay || new Date().toISOString().slice(0, 10);
  pendingUsage = newUsage();
  lastFlushAt = Date.now();
  return recordUsage(db, snapshot, day);
}

async function recordUsage(db, usage, day) {
  // 这次 UPSERT 本身也要算一行写入；若同时要更新累计量，再加一行
  const selfWrites = 1 + (usage.received ? 1 : 0);
  await db.prepare(
    'INSERT INTO daily_usage (day, requests, d1_reads, d1_writes) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(day) DO UPDATE SET requests = requests + excluded.requests, ' +
    'd1_reads = d1_reads + excluded.d1_reads, d1_writes = d1_writes + excluded.d1_writes'
  ).bind(day, usage.requests, usage.reads, usage.writes + selfWrites).run();
  if (usage.received) {
    await db.prepare(
      'INSERT INTO stats (id, received, forwarded) VALUES (1, ?, 0) ' +
      'ON CONFLICT(id) DO UPDATE SET received = received + excluded.received, updated_at = CURRENT_TIMESTAMP'
    ).bind(usage.received).run();
  }
}

// 转发在响应之后才跑（ctx.waitUntil），赶不上请求级结算，这里单独补一次
async function recordLateUsage(db, usage, day) {
  const selfWrites = 2; // 下面这两条语句自身也算写入
  await db.prepare(
    'INSERT INTO stats (id, received, forwarded) VALUES (1, 0, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET forwarded = forwarded + excluded.forwarded, updated_at = CURRENT_TIMESTAMP'
  ).bind(usage.forwarded).run();
  await db.prepare(
    'INSERT INTO daily_usage (day, requests, d1_reads, d1_writes) VALUES (?, 0, ?, ?) ' +
    'ON CONFLICT(day) DO UPDATE SET d1_reads = d1_reads + excluded.d1_reads, ' +
    'd1_writes = d1_writes + excluded.d1_writes'
  ).bind(day, usage.reads, usage.writes + selfWrites).run();
}

// ======================= Worker 核心服务入口 =======================
const FREE_LIMITS = { requests: 100000, d1_reads: 5000000, d1_writes: 100000 };

const WorkerApp = {
  async fetch(request, env, ctx) {
    const usage = newUsage();
    usage.requests += 1; // 免费额度按「进来的请求」计，cron 调用也算
    const db = instrumentDb(env.DB, usage);
    // 统计按 UTC 日切分，和 Cloudflare 免费额度的重置时间（00:00 UTC）对齐
    const day = new Date().toISOString().slice(0, 10);
    try {
      return await WorkerApp._handle(request, env, ctx, db, usage);
    } finally {
      foldUsage(usage, day);
      // 有消息进来就立刻结算，其余按 20 秒一批
      if (flushDue(usage.received > 0)) {
        ctx.waitUntil(flushUsage(env.DB).catch(() => {}));
      }
    }
  },

  async _handle(request, env, ctx, db, usage) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 首页
    if (path === '/' || path === '/index.html') {
      return htmlResponse(HOME_HTML_CONTENT);
    }

    // 2. 端点存在性查询：首页「已有端点」入口用，只回答存在与否，不做鉴权
    if (path === '/api/exists' && request.method === 'GET') {
      const id = (url.searchParams.get('id') || '').trim();
      const hit = id ? await db.prepare('SELECT id FROM bins WHERE id = ?').bind(id).first() : null;
      return Response.json({ ok: true, exists: !!hit });
    }

    // 3. 用量与额度：首页统计条用，公开只读
    if (path === '/api/stats' && request.method === 'GET') {
      const now = new Date().toISOString();
      // 先把攒着的计数落库，保证首页看到的是最新值（最多 20 秒一次写入）
      if (flushDue(false)) await flushUsage(env.DB).catch(() => {});
      const totals = await db.prepare('SELECT received, forwarded FROM stats WHERE id = 1').first();
      const today = await db.prepare('SELECT requests, d1_reads, d1_writes FROM daily_usage WHERE day = ?')
        .bind(now.slice(0, 10)).first();
      return new Response(JSON.stringify({
        ok: true,
        day: now.slice(0, 10),
        received: (totals && totals.received) || 0,
        forwarded: (totals && totals.forwarded) || 0,
        usage: {
          requests: (today && today.requests) || 0,
          d1_reads: (today && today.d1_reads) || 0,
          d1_writes: (today && today.d1_writes) || 0
        },
        limits: FREE_LIMITS,
        updated_at: now,
        measured: 'self'
      }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
    }

    // 4. 创建端点（必须设置访问密码）
    if (path === '/api/new' && request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      const wantsJson = contentType.includes('application/json');
      let password = '';
      try {
        if (wantsJson) {
          const body = await request.json();
          password = String(body.password || '').trim();
        } else {
          const form = await request.formData();
          password = String(form.get('password') || '').trim();
        }
      } catch (err) {
        password = '';
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        if (wantsJson) {
          return Response.json({ ok: false, error: '密码至少 ' + MIN_PASSWORD_LENGTH + ' 位' }, { status: 400 });
        }
        return htmlResponse(errorPage('访问密码至少需要 ' + MIN_PASSWORD_LENGTH + ' 位，请返回重新创建。'), 400);
      }

      const binId = crypto.randomUUID().split('-')[0];
      const salt = randomHex(16);
      const tokenHash = await hashPassword(salt, password);
      await db.prepare('INSERT INTO bins (id, salt, token_hash, last_active) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .bind(binId, salt, tokenHash).run();

      const headers = new Headers();
      headers.append('Set-Cookie', buildCookie(cookieNameFor(binId), await sessionTokenFor(tokenHash), url, SESSION_MAX_AGE));

      if (wantsJson) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
        return new Response(JSON.stringify({ ok: true, bin_id: binId, view_url: '/view/' + binId }), { status: 200, headers });
      }
      headers.set('Location', '/view/' + binId);
      return new Response(null, { status: 303, headers });
    }

    // 5. 控制台登录
    const loginMatch = path.match(/^\/api\/([a-zA-Z0-9_-]+)\/login$/);
    if (loginMatch && request.method === 'POST') {
      const binId = loginMatch[1];
      const bin = await db.prepare('SELECT id, salt, token_hash FROM bins WHERE id = ?').bind(binId).first();
      if (!bin || !bin.token_hash) return htmlResponse(errorPage('端点不存在或已被安全销毁。'), 404);

      let password = '';
      try {
        const form = await request.formData();
        password = String(form.get('password') || '').trim();
      } catch (err) {
        password = '';
      }

      if (await hashPassword(bin.salt || '', password) !== bin.token_hash) {
        return htmlResponse(loginPage(binId, '密码不正确，请重新输入。'), 401);
      }

      const headers = new Headers({ 'Location': '/view/' + binId });
      headers.append('Set-Cookie', buildCookie(cookieNameFor(binId), await sessionTokenFor(bin.token_hash), url, SESSION_MAX_AGE));
      return new Response(null, { status: 303, headers });
    }

    // 6. 退出登录
    const logoutMatch = path.match(/^\/api\/([a-zA-Z0-9_-]+)\/logout$/);
    if (logoutMatch && request.method === 'POST') {
      const binId = logoutMatch[1];
      const headers = new Headers({ 'Location': '/view/' + binId });
      headers.append('Set-Cookie', buildCookie(cookieNameFor(binId), '', url, 0));
      return new Response(null, { status: 303, headers });
    }

    // 7. 注销端点：永久删除端点、报文与转发规则（需登录）
    const destroyMatch = path.match(/^\/api\/([a-zA-Z0-9_-]+)\/destroy$/);
    if (destroyMatch && request.method === 'POST') {
      const binId = destroyMatch[1];
      const bin = await db.prepare('SELECT id, salt, token_hash FROM bins WHERE id = ?').bind(binId).first();
      if (!bin) return htmlResponse(errorPage('端点不存在或已被销毁。'), 404);
      if (!(await isConsoleAuthenticated(request, binId, bin))) {
        return htmlResponse(loginPage(binId, '会话已失效，请重新登录后再注销。'), 401);
      }

      await db.prepare('DELETE FROM messages WHERE bin_id = ?').bind(binId).run();
      await db.prepare('DELETE FROM forwarders WHERE bin_id = ?').bind(binId).run();
      await db.prepare('DELETE FROM bins WHERE id = ?').bind(binId).run();

      const headers = new Headers({ 'Location': '/' });
      headers.append('Set-Cookie', buildCookie(cookieNameFor(binId), '', url, 0));
      return new Response(null, { status: 303, headers });
    }

    // 8. 控制台页面（需登录）
    const viewMatch = path.match(/^\/view\/([a-zA-Z0-9_-]+)$/);
    if (viewMatch) {
      const binId = viewMatch[1];
      const bin = await db.prepare('SELECT id, salt, token_hash FROM bins WHERE id = ?').bind(binId).first();
      if (!bin) {
        return htmlResponse(errorPage('端点不存在或已被安全销毁（闲置超过 3 天自动清理）。'), 404);
      }
      if (!(await isConsoleAuthenticated(request, binId, bin))) {
        return htmlResponse(loginPage(binId, ''), 401);
      }
      const pageHtml = VIEW_HTML_CONTENT
        .replace(/\${binId}/g, binId)
        .replace(/\${hookUrl}/g, 'https://' + url.host + '/hook/' + binId);
      return htmlResponse(pageHtml);
    }

    // 9. 控制台接口（需登录）
    const apiMatch = path.match(/^\/api\/([a-zA-Z0-9_-]+)\/(events|clear|forwarders(?:\/\d+)?)$/);
    if (apiMatch) {
      const binId = apiMatch[1];
      const bin = await db.prepare('SELECT id, salt, token_hash FROM bins WHERE id = ?').bind(binId).first();
      if (!bin) return Response.json({ ok: false, error: 'endpoint not found' }, { status: 404 });
      if (!(await isConsoleAuthenticated(request, binId, bin))) {
        return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
      }

      const section = apiMatch[2];

      if (section === 'events' && request.method === 'GET') {
        const { results } = await db.prepare(
          'SELECT * FROM messages WHERE bin_id = ? ORDER BY id DESC LIMIT 50'
        ).bind(binId).all();
        return Response.json({ messages: results || [] });
      }

      if (section === 'clear' && request.method === 'POST') {
        await db.prepare('DELETE FROM messages WHERE bin_id = ?').bind(binId).run();
        return Response.json({ ok: true });
      }

      const fwdIdMatch = section.match(/^forwarders\/(\d+)$/);
      if (section === 'forwarders' && request.method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM forwarders WHERE bin_id = ?').bind(binId).all();
        return Response.json({ forwarders: results || [], limit: MAX_FORWARDERS_PER_BIN });
      }
      if (section === 'forwarders' && request.method === 'POST') {
        const used = await db.prepare('SELECT COUNT(*) AS n FROM forwarders WHERE bin_id = ?').bind(binId).first();
        if (used && used.n >= MAX_FORWARDERS_PER_BIN) {
          return Response.json({ ok: false, error: 'forwarder limit reached', limit: MAX_FORWARDERS_PER_BIN },
                               { status: 400 });
        }
        const body = await request.json();
        await db.prepare('INSERT INTO forwarders (bin_id, name, target_url, forward_type) VALUES (?, ?, ?, ?)')
          .bind(binId, body.name, body.target_url, body.forward_type).run();
        return Response.json({ ok: true, limit: MAX_FORWARDERS_PER_BIN });
      }
      if (fwdIdMatch && request.method === 'DELETE') {
        await db.prepare('DELETE FROM forwarders WHERE id = ? AND bin_id = ?').bind(fwdIdMatch[1], binId).run();
        return Response.json({ ok: true });
      }
    }

    // 10. Webhook 接收主入口（需推送令牌）
    const hookMatch = path.match(/^\/hook\/([a-zA-Z0-9_-]+)$/);
    if (hookMatch) {
      const binId = hookMatch[1];
      const bin = await db.prepare('SELECT id, salt, token_hash FROM bins WHERE id = ?').bind(binId).first();
      if (!bin || !bin.token_hash) {
        return Response.json({ ok: false, error: 'endpoint not found or expired' }, { status: 404 });
      }

      const providedToken = url.searchParams.get('token') || request.headers.get('x-webhook-token') || '';
      if (!providedToken || (await hashPassword(bin.salt || '', providedToken)) !== bin.token_hash) {
        return Response.json({ ok: false, error: 'invalid or missing push token' }, { status: 401 });
      }

      const method = request.method;
      const clientIp = request.headers.get('cf-connecting-ip') || '';
      const rawBody = await request.text();
      // 入库用收敛后的副本；转发继续用未截断的 rawBody，保住「原样透传」语义
      const fitted = fitForStorage(rawBody);
      const headersObj = {};
      for (const [k, v] of request.headers.entries()) {
        headersObj[k] = v;
      }

      const insertResult = await db.prepare(
        'INSERT INTO messages (bin_id, method, client_ip, headers, query_params, raw_body) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        binId,
        method,
        clientIp,
        JSON.stringify(redactHeaders(headersObj), null, 2),
        redactQuery(url.search),
        fitted.body
      ).run();
      const messageId = insertResult.meta?.last_row_id;
      usage.received += 1;

      await db.prepare('UPDATE bins SET last_active = CURRENT_TIMESTAMP WHERE id = ?').bind(binId).run();

      ctx.waitUntil((async () => {
        // 这一段跑在响应之后，用量单独计一份，收尾统一补结算
        const late = newUsage();
        const lateDb = instrumentDb(env.DB, late);
        const { results: fwds } = await lateDb.prepare(
          'SELECT * FROM forwarders WHERE bin_id = ? AND enabled = 1 ORDER BY id ASC'
        ).bind(binId).all();
        // 兜底：上限下调前建好的老端点可能留有更多规则，这里再切一次，绝不让子请求爆掉
        const active = (fwds || []).slice(0, MAX_FORWARDERS_PER_BIN);
        const skipped = (fwds || []).length - active.length;
        if (active.length > 0) {
          const results = await Promise.all(active.map(f => dispatchForward(f, rawBody, binId)));
          const logs = results.map(r => r.log);
          late.forwarded = results.filter(r => r.ok).length;
          if (skipped > 0) {
            logs.push('[限额] 本端点转发规则超过 ' + MAX_FORWARDERS_PER_BIN + ' 条，本次仅执行前 ' +
              active.length + ' 条，其余 ' + skipped + ' 条已跳过。');
          }
          await lateDb.prepare('UPDATE messages SET forward_logs = ? WHERE id = ?')
            .bind(logs.join('\n'), messageId).run();
          await recordLateUsage(env.DB, late, new Date().toISOString().slice(0, 10));
        }
      })());

      return Response.json({
        ok: true,
        bin_id: binId,
        message_id: messageId,
        received_at: new Date().toISOString(),
        truncated: fitted.truncated,
        ...(fitted.truncated ? { original_bytes: fitted.originalBytes } : {})
      });
    }

    return new Response('Not Found', { status: 404 });
  },

    // 11. 定时任务：闲置满 3 天物理自毁
  async scheduled(event, env, ctx) {
    const usage = newUsage();
    usage.requests += 1;
    const day = new Date().toISOString().slice(0, 10);
    const db = instrumentDb(env.DB, usage);
    await db.prepare(`
      DELETE FROM messages WHERE bin_id IN (
        SELECT id FROM bins WHERE last_active < datetime('now', '-3 days')
      )
    `).run();

    await db.prepare(`
      DELETE FROM forwarders WHERE bin_id IN (
        SELECT id FROM bins WHERE last_active < datetime('now', '-3 days')
      )
    `).run();

    await db.prepare(`
      DELETE FROM bins WHERE last_active < datetime('now', '-3 days')
    `).run();

    await recordUsage(env.DB, usage, day).catch(() => {});
  }
};

export default WorkerApp;
