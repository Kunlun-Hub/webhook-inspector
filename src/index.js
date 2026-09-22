// Webhook Inspector & Multi-Channel Relay Hub
// Front-end follows Apple Editorial Design Guidelines (DESIGN-apple.md)
// Zero-emoji policy: every glyph on the page is a vector SVG icon

const HOME_HTML_CONTENT = `﻿<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Webhook Inspector — 全协议 Webhook 接收、调试与多端路由中枢</title>
<style>
  :root {
    --primary: #0066cc;
    --primary-hover: #0071e3;
    --ink: #1d1d1f;
    --ink-muted-80: #333333;
    --ink-muted: #86868b;
    --hairline: #d2d2d7;
    --hairline-soft: #e5e5ea;
    --divider-soft: #f0f0f0;
    --canvas: #ffffff;
    --canvas-parchment: #f5f5f7;
    --surface-pearl: #fafafc;
    --font-display: "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --font-text: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background-color: var(--canvas-parchment);
    color: var(--ink);
    font-family: var(--font-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.47;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Frosted Glass Top Navigation */
  .global-nav {
    flex-shrink: 0;
    height: 48px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--hairline-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
  }
  .nav-inner {
    max-width: 1080px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-brand {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--ink);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nav-brand-icon { color: var(--primary); display: flex; align-items: center; justify-content: center; }
  .nav-cta {
    font-size: 12px;
    font-weight: 500;
    background: var(--primary);
    color: #ffffff;
    padding: 6px 16px;
    border-radius: 9999px;
    transition: background 0.15s, transform 0.15s;
    border: none;
    cursor: pointer;
  }
  .nav-cta:hover { background: var(--primary-hover); transform: scale(1.02); }
  .nav-actions { display: flex; align-items: center; gap: 10px; }
  /* 次级胶囊：与主操作并排时的“幽灵按钮” */
  .nav-ghost {
    font-size: 12px;
    font-weight: 500;
    background: transparent;
    color: var(--primary);
    padding: 5px 15px;
    border: 1px solid var(--primary);
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .nav-ghost:hover { background: rgba(0, 102, 204, 0.08); transform: scale(1.02); }

  /* 累计量与当日额度：细线分隔的四格，无投影 */
  .stat-strip {
    display: flex;
    align-items: stretch;
    width: 100%;
    max-width: 720px;
    margin-bottom: 22px;
  }
  .stat-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0 12px;
    border-left: 1px solid var(--hairline-soft);
  }
  .stat-cell:first-child { border-left: none; }
  .stat-num {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .stat-cap { font-size: 12px; color: var(--ink-muted); }
  /* 额度用进度条：只给百分比，不暴露具体数字；低于阈值换色提醒 */
  .stat-bar {
    display: block;
    width: 100%;
    height: 6px;
    margin-top: 8px;
    border-radius: 9999px;
    background: var(--hairline-soft);
    overflow: hidden;
  }
  .stat-bar-fill {
    display: block;
    width: 0;
    height: 100%;
    border-radius: 9999px;
    background: var(--primary);
    transition: width 0.45s ease, background 0.2s ease;
  }
  .stat-bar-fill.is-warn { background: #c77700; }
  .stat-bar-fill.is-danger { background: #c5221f; }
  .stat-num.is-warn { color: #c77700; }
  .stat-num.is-danger { color: #c5221f; }
  .stat-note {
    font-size: 11px;
    color: var(--ink-muted);
    margin-bottom: 18px;
  }

  /* Vertically centered body */
  .page-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }

  .hero {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 24px 0;
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: 44px;
    font-weight: 600;
    line-height: 1.09;
    letter-spacing: -0.374px;
    color: var(--ink);
    max-width: 860px;
    margin-bottom: 30px;
  }
  .btn-pill-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--primary);
    color: #ffffff;
    font-family: var(--font-text);
    font-size: 16px;
    font-weight: 400;
    letter-spacing: -0.2px;
    padding: 12px 28px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .btn-pill-primary:hover { background: var(--primary-hover); transform: scale(1.015); }
  .btn-pill-primary:active { transform: scale(0.985); }
  .hero-note {
    font-size: 13px;
    color: var(--ink-muted);
    letter-spacing: -0.12px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    flex-wrap: wrap;
  }
  .hero-note span { display: inline-flex; align-items: center; gap: 4px; }

  .features {
    margin-bottom: auto;
    max-width: 1080px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding: 46px 24px 0;
  }
  .grid-4col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .card-utility {
    background: var(--canvas);
    border-radius: 18px;
    border: 1px solid var(--hairline-soft);
    padding: 22px 20px;
    text-align: left;
    transition: border-color 0.2s;
  }
  .card-utility:hover { border-color: var(--hairline); }
  .card-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: var(--canvas-parchment);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    margin-bottom: 14px;
  }
  .card-heading {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .card-body { font-size: 13.5px; line-height: 1.5; color: var(--ink-muted); }

  .fine-footer {
    flex-shrink: 0;
    padding: 20px 24px 22px;
    border-top: 1px solid var(--hairline-soft);
    text-align: center;
    font-size: 12px;
    color: var(--ink-muted);
    letter-spacing: -0.12px;
  }

  /* ---------- Apple sheet modal ---------- */
  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.38);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .modal-overlay.show { display: flex; }
  .sheet {
    background: var(--canvas);
    width: 580px;
    max-width: 100%;
    max-height: 90vh;
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: sheetIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes sheetIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  .sheet-h {
    padding: 20px 24px;
    border-bottom: 1px solid var(--hairline-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .sheet-title {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sheet-close {
    background: var(--canvas-parchment);
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-muted);
    transition: background 0.15s, color 0.15s;
  }
  .sheet-close:hover { background: #e5e5ea; color: var(--ink); }
  .sheet.is-compact { width: 460px; }
  #find-form { padding-bottom: 20px; }
  .hint-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline-soft);
    border-radius: 4px;
    padding: 1px 5px;
  }
  .sheet-b {
    padding: 20px 24px 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .sheet-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 4px;
  }
  #create-form {
    flex: 0 0 auto;
    margin-top: 16px;
    padding: 16px 0 20px;
    border-top: 1px solid var(--hairline-soft);
  }
  #create-form .form-group:first-child { margin-top: 0; }

  .block-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
    letter-spacing: -0.1px;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legal-box {
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline-soft);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--ink-muted-80);
  }
  .legal-box ol { padding-left: 18px; }
  .legal-box li { margin-bottom: 6px; }
  .legal-box li:last-child { margin-bottom: 0; }

  .warn-box {
    background: #fff8e6;
    border: 1px solid #f2dda4;
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12.5px;
    line-height: 1.6;
    color: #7a5800;
    margin-bottom: 18px;
  }
  .warn-box strong { color: #6b4d00; }
  .warn-box ul { padding-left: 18px; margin-top: 6px; }
  .warn-box li { margin-bottom: 5px; }
  .warn-box li:last-child { margin-bottom: 0; }
  .warn-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background: rgba(122, 88, 0, 0.10);
    border-radius: 5px;
    padding: 1px 5px;
  }

  .form-group { margin-top: 18px; }
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
    letter-spacing: -0.1px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .form-control {
    width: 100%;
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .form-control:focus { background: #ffffff; border-color: var(--primary); }
  .form-hint { font-size: 12px; color: var(--ink-muted); margin-top: 6px; }

  .agree-row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 18px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink);
  }
  .agree-row input { margin-top: 3px; flex-shrink: 0; width: 15px; height: 15px; accent-color: var(--primary); }

  .modal-err {
    display: none;
    margin-top: 14px;
    font-size: 13px;
    color: #c5221f;
    background: #fce8e6;
    border: 1px solid #f8d0cd;
    border-radius: 8px;
    padding: 9px 12px;
  }
  .modal-err.show { display: block; }

  .sheet-f {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--hairline-soft);
  }
  .btn-secondary {
    background: var(--canvas);
    color: var(--ink);
    border: 1px solid var(--hairline);
    font-family: var(--font-text);
    font-size: 14px;
    border-radius: 9999px;
    padding: 9px 20px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-secondary:hover { background: #eaeaea; }
  .btn-primary-solid {
    background: var(--primary);
    color: #ffffff;
    border: none;
    font-family: var(--font-text);
    font-size: 14px;
    border-radius: 9999px;
    padding: 9px 22px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-primary-solid:hover { background: var(--primary-hover); }

  @media (max-width: 900px) {
    .grid-4col { grid-template-columns: repeat(2, 1fr); }
    .hero-title { font-size: 34px; }
  }
  @media (max-width: 600px) {
    .grid-4col { grid-template-columns: 1fr; }
    .page-body { justify-content: flex-start; }
    .hero { margin-top: 0; }
    .features { margin-bottom: 0; }
  }
</style>
</head>
<body>
  <header class="global-nav">
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <span class="nav-brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8h13"/>
            <path d="m10 4-4 4 4 4"/>
            <path d="M18 16H5"/>
            <path d="m14 12 4 4-4 4"/>
          </svg>
        </span>
        <span>Webhook Inspector</span>
      </a>
      <div class="nav-actions">
        <button type="button" class="nav-ghost" onclick="openFind()">已有端点</button>
        <button type="button" class="nav-cta" onclick="openCreate()">创建端点</button>
      </div>
    </div>
  </header>

  <div class="page-body">
    <main class="hero">
      <div class="stat-strip" id="stat-strip">
        <div class="stat-cell">
          <span class="stat-num" id="st-received">&mdash;</span>
          <span class="stat-cap">已接收消息</span>
        </div>
        <div class="stat-cell">
          <span class="stat-num" id="st-forwarded">&mdash;</span>
          <span class="stat-cap">已转发投递</span>
        </div>
        <div class="stat-cell">
          <span class="stat-num" id="st-workers">&mdash;</span>
          <span class="stat-cap">今日 Workers 请求余量</span>
          <span class="stat-bar"><span class="stat-bar-fill" id="st-workers-bar"></span></span>
        </div>
        <div class="stat-cell">
          <span class="stat-num" id="st-d1">&mdash;</span>
          <span class="stat-cap">今日 D1 写入余量</span>
          <span class="stat-bar"><span class="stat-bar-fill" id="st-d1-bar"></span></span>
        </div>
      </div>
      <div class="stat-note">进度条为当日剩余额度，按 UTC 日重置（北京时间 08:00）&middot; 数据为本站自计，约 1 分钟内更新</div>

      <h1 class="hero-title">透视每一次回调，连接每一个工作流。</h1>

      <button type="button" class="btn-pill-primary" onclick="openCreate()">
        <span>立即创建专属端点</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      <div class="hero-note">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          密码保护控制台
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          令牌校验推送
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          闲置自动销毁
        </span>
      </div>
    </main>

    <section class="features" id="features">
      <div class="grid-4col">
        <div class="card-utility">
          <div class="card-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <h3 class="card-heading">全协议即时捕获</h3>
          <p class="card-body">完整接收 POST、GET、PUT 等各类请求，JSON、表单或原始数据流均可直接接入并结构化归档。</p>
        </div>

        <div class="card-utility">
          <div class="card-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h3 class="card-heading">高保真报文还原</h3>
          <p class="card-body">Headers、Query 与 Body 逐字节保留，不做任何截断篡改。支持 JSON 智能排版与一键复制原文。</p>
        </div>

        <div class="card-utility">
          <div class="card-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <h3 class="card-heading">多渠道即刻中继</h3>
          <p class="card-body">原生适配企业微信、钉钉、飞书、Telegram、Discord 与 Slack，并打通 ntfy、Bark、Gotify、Server 酱等推送通道，各平台消息格式自动装配。</p>
        </div>

        <div class="card-utility">
          <div class="card-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h3 class="card-heading">沙箱隔离与隐私防护</h3>
          <p class="card-body">每个端点独立隔离，支持一键清空与闲置过期自动销毁，敏感报文与凭据零沉淀。</p>
        </div>
      </div>
    </section>
  </div>

  <footer class="fine-footer">
    <div>© 2026 Webhook Inspector · 全协议 Webhook 接收、调试与多端路由中枢</div>
  </footer>

  <!-- 创建端点：免责声明 + 设置访问密码 -->
  <div class="modal-overlay" id="create-modal">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <div class="sheet-h">
        <span class="sheet-title" id="create-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          创建端点 · 请先阅读并设置密码
        </span>
        <button type="button" class="sheet-close" onclick="closeCreate()" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="sheet-b">
        <div class="sheet-scroll">
        <div class="warn-box">
          <strong>请务必保护好你的密码与推送令牌</strong>
          <ul>
            <li>你即将设置的密码有<strong>两个用途</strong>：① 登录本端点的 Web 控制台；② 作为第三方系统推送时的身份令牌。</li>
            <li>推送时需在地址后追加 <span class="warn-code">?token=你的密码</span>，或通过 <span class="warn-code">X-Webhook-Token</span> 请求头传入。</li>
            <li>请勿截图、发到聊天群、写入公开代码仓库或提交到工单系统，避免密码外泄。</li>
            <li>密码一旦泄露，任何人都能查看你收到的全部报文，或伪装成你的系统推送伪造数据。</li>
            <li>请仅把推送地址与令牌配置在受信任的服务器上；若怀疑已泄露，请立即删除该端点并重新创建。</li>
          </ul>
        </div>
        <div class="block-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          免责声明
        </div>
        <div class="legal-box">
          <ol>
            <li>本服务为开发者提供临时的 Webhook 接收、调试与消息转发能力，仅限用于合法的系统联调、测试与内部告警通知。</li>
            <li>请勿用于接收、存储或转发任何违反法律法规、侵犯他人权益或涉及他人隐私的内容。</li>
            <li>你对自己通过本服务推送、存储与转发的一切内容负全部责任；因使用本服务产生的任何直接或间接损失，由使用者自行承担。</li>
            <li>请勿推送银行卡号、身份证号、账号密码等敏感个人信息；确需测试时请使用脱敏数据。</li>
            <li>端点数据仅在服务端临时保存，连续 3 天无任何活动将自动全部销毁，本服务不对数据持久性与可用性作任何承诺。</li>
            <li>本服务按「现状」提供，可能因维护、升级或不可抗力而中断，恕不另行通知。</li>
          </ol>
        </div>

        </div>

        <form id="create-form" method="POST" action="/api/new" onsubmit="return validateCreate()">
          <div class="form-group">
            <label class="form-label" for="pwd">设置访问密码</label>
            <input class="form-control" type="password" id="pwd" name="password" placeholder="至少 8 位，建议字母 + 数字" autocomplete="new-password" required>
            <div class="form-hint">该密码同时用于控制台登录与推送令牌校验，服务端仅保存加盐哈希。</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="pwd2">确认访问密码</label>
            <input class="form-control" type="password" id="pwd2" placeholder="请再次输入相同密码" autocomplete="new-password" required>
          </div>

          <label class="agree-row" for="agree">
            <input type="checkbox" id="agree">
            <span>我已阅读并同意上述免责声明，并承诺妥善保管密码与推送令牌，不用于任何违法或侵权用途。</span>
          </label>

          <div class="modal-err" id="modal-err"></div>

          <div class="sheet-f">
            <button type="button" class="btn-secondary" onclick="closeCreate()">取消</button>
            <button type="submit" class="btn-primary-solid">同意并创建端点</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 已有端点：输入 ID 或粘贴推送地址，直接进控制台 -->
  <div class="modal-overlay" id="find-modal">
    <div class="sheet is-compact" role="dialog" aria-modal="true" aria-labelledby="find-title">
      <div class="sheet-h">
        <span class="sheet-title" id="find-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          查看已有端点
        </span>
        <button type="button" class="sheet-close" onclick="closeFind()" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="sheet-b">
        <form id="find-form" onsubmit="return openExistingEndpoint()">
          <div class="form-group">
            <label class="form-label" for="find-id">端点 ID 或推送地址</label>
            <input class="form-control" type="text" id="find-id" autocomplete="off" spellcheck="false"
                   placeholder="a643fdac 或 https://…/hook/a643fdac?token=…">
            <div class="form-hint">就是推送地址 <span class="hint-code">/hook/</span> 后面那一段 8 位字符；粘贴整条地址会自动识别。</div>
          </div>

          <div class="modal-err" id="find-err"></div>

          <div class="sheet-f">
            <button type="button" class="btn-secondary" onclick="closeFind()">取消</button>
            <button type="submit" class="btn-primary-solid" id="find-submit">打开控制台</button>
          </div>
        </form>
      </div>
    </div>
  </div>

<script>
function openCreate() {
  document.getElementById('create-modal').classList.add('show');
  setTimeout(function () { document.getElementById('pwd').focus(); }, 60);
}

function closeCreate() {
  document.getElementById('create-modal').classList.remove('show');
  document.getElementById('modal-err').classList.remove('show');
}

function showErr(msg) {
  var el = document.getElementById('modal-err');
  el.textContent = msg;
  el.classList.add('show');
}

function validateCreate() {
  var pwd = document.getElementById('pwd').value;
  var pwd2 = document.getElementById('pwd2').value;
  var agree = document.getElementById('agree').checked;

  if (pwd.length < 8) { showErr('访问密码至少需要 8 位。'); return false; }
  if (pwd !== pwd2) { showErr('两次输入的密码不一致，请重新确认。'); return false; }
  if (!agree) { showErr('请先勾选并同意免责声明。'); return false; }

  try { sessionStorage.setItem('wh_pending_pwd', pwd); } catch (e) {}
  return true;
}

function openFind() {
  document.getElementById('find-modal').classList.add('show');
  document.getElementById('find-err').classList.remove('show');
  setTimeout(function () { document.getElementById('find-id').focus(); }, 60);
}

function closeFind() {
  document.getElementById('find-modal').classList.remove('show');
  document.getElementById('find-err').classList.remove('show');
}

function showFindErr(msg) {
  var el = document.getElementById('find-err');
  el.textContent = msg;
  el.classList.add('show');
}

// 允许直接粘贴整条推送地址，自动从 /hook/<id> 或 /view/<id> 中取出 id
function parseEndpointInput(raw) {
  var s = (raw || '').trim();
  if (!s) return '';
  var m = s.match(/\\/(?:hook|view)\\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : '';
}

function openExistingEndpoint() {
  var id = parseEndpointInput(document.getElementById('find-id').value);
  if (!id) {
    showFindErr('请输入端点 ID，或直接粘贴完整的推送地址。');
    return false;
  }
  var btn = document.getElementById('find-submit');
  btn.disabled = true;
  btn.textContent = '查询中…';
  fetch('/api/exists?id=' + encodeURIComponent(id)).then(function (res) {
    return res.json();
  }).then(function (data) {
    if (!data || !data.exists) {
      btn.disabled = false;
      btn.textContent = '打开控制台';
      showFindErr('没有此端点：' + id + '。它可能从未创建，或已闲置超过 3 天被自动销毁。');
      return;
    }
    location.href = '/view/' + id;
  }).catch(function () {
    btn.disabled = false;
    btn.textContent = '打开控制台';
    showFindErr('查询失败，请检查网络后重试。');
  });
  return false;
}

document.getElementById('create-modal').addEventListener('click', function (ev) {
  if (ev.target === this) closeCreate();
});
document.getElementById('find-modal').addEventListener('click', function (ev) {
  if (ev.target === this) closeFind();
});
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Escape') return;
  closeCreate();
  closeFind();
});
// 首页统计条：累计量 + 当日额度余量（接口侧带 60 秒缓存）
function fmtNum(n) {
  return Number(n || 0).toLocaleString('zh-CN');
}

function loadStats() {
  fetch('/api/stats').then(function (res) {
    return res.json();
  }).then(function (d) {
    if (!d || !d.ok) return;
    document.getElementById('st-received').textContent = fmtNum(d.received);
    document.getElementById('st-forwarded').textContent = fmtNum(d.forwarded);
    renderQuota('st-workers', 'st-workers-bar', d.usage.requests, d.limits.requests);
    renderQuota('st-d1', 'st-d1-bar', d.usage.d1_writes, d.limits.d1_writes);
  }).catch(function () {});
}

// 额度只对外暴露百分比：进度条长度 = 剩余占比，低于 20% 转琥珀、低于 5% 转红
function renderQuota(numId, barId, used, limit) {
  var total = Number(limit || 0);
  var left = Math.max(0, total - Number(used || 0));
  var pct = total > 0 ? (left / total) * 100 : 0;
  var label;
  if (pct >= 99.95) label = '100%';
  else if (pct <= 0) label = '0%';
  else if (pct < 0.05) label = '<0.1%';
  else label = pct.toFixed(1) + '%';
  var tone = pct < 5 ? ' is-danger' : (pct < 20 ? ' is-warn' : '');
  var num = document.getElementById(numId);
  num.textContent = label;
  num.className = 'stat-num' + tone;
  var fill = document.getElementById(barId);
  fill.style.width = pct.toFixed(2) + '%';
  fill.className = 'stat-bar-fill' + tone;
}

loadStats();
</script>
</body>
</html>
`;

const VIEW_HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>端点监控 \${binId} — Webhook Inspector</title>
<style>
  :root {
    --primary: #0066cc;
    --primary-hover: #0071e3;
    --primary-focus: #0071e3;
    --primary-on-dark: #2997ff;
    --ink: #1d1d1f;
    --ink-muted-80: #333333;
    --ink-muted: #86868b;
    --canvas: #ffffff;
    --canvas-parchment: #f5f5f7;
    --surface-pearl: #fafafc;
    --hairline: #d2d2d7;
    --hairline-soft: #e5e5ea;
    --divider-soft: #f0f0f0;
    --code-bg: #1e1e20;
    --font-display: "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --font-text: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--canvas-parchment);
    color: var(--ink);
    font-family: var(--font-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Frosted Glass Top Sub-Nav */
  .sub-nav {
    height: 52px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--hairline-soft);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 50;
    flex-shrink: 0;
  }
  .nav-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-chip {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.2px;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .brand-chip-icon {
    color: var(--primary);
    display: flex;
    align-items: center;
  }
  
  /* Endpoint URL Capsule (Apple Full-Pill Radius 9999px) */
  .url-capsule {
    display: flex;
    align-items: center;
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: 9999px;
    padding: 3px 6px 3px 14px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--primary);
    font-weight: 500;
    gap: 8px;
  }
  #hook-url {
    max-width: 34vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34c759;
    box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.2);
    display: inline-block;
  }
  .btn-capsule-copy {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--surface-pearl);
    border: 1px solid var(--hairline);
    border-radius: 9999px;
    font-family: var(--font-text);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink);
    padding: 4px 10px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-capsule-copy:hover {
    background: #e8e8ed;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-apple-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--canvas);
    color: var(--ink);
    border: 1px solid var(--hairline);
    font-family: var(--font-text);
    font-size: 13px;
    font-weight: 400;
    border-radius: 9999px;
    padding: 6px 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-apple-secondary:hover {
    background: #eaeaea;
  }
  .btn-apple-danger {
    color: #c5221f;
    border-color: #fce8e6;
    background: #fff;
  }
  .btn-apple-danger:hover {
    background: #fce8e6;
  }
  .btn-apple-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--primary);
    color: #ffffff;
    font-family: var(--font-text);
    font-size: 13px;
    font-weight: 400;
    border-radius: 9999px;
    padding: 6px 14px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s;
  }
  .btn-apple-action:hover {
    background: var(--primary-hover);
  }

  /* Split Pane Workspace */
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
    padding: 16px;
    gap: 16px;
  }

  /* Left Sidebar (Store Utility Card Radius 18px, Hairline Border, 0 Shadow) */
  .pane-sidebar {
    width: 320px;
    background: var(--canvas);
    border-radius: 18px;
    border: 1px solid var(--hairline-soft);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }
  .side-h {
    padding: 12px 16px;
    border-bottom: 1px solid var(--hairline-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .side-h-title {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.15px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .side-badge {
    font-size: 11px;
    color: var(--ink-muted);
    background: var(--canvas-parchment);
    padding: 2px 8px;
    border-radius: 9999px;
  }

  /* Search & Filter Bar */
  .side-filter-wrap {
    padding: 8px 12px;
    border-bottom: 1px solid var(--hairline-soft);
    background: var(--surface-pearl);
  }
  .search-box {
    display: flex;
    align-items: center;
    background: var(--canvas);
    border: 1px solid var(--hairline);
    border-radius: 9999px;
    padding: 4px 10px;
    gap: 6px;
  }
  .search-box svg {
    color: var(--ink-muted);
    flex-shrink: 0;
  }
  .search-input {
    border: none;
    outline: none;
    background: transparent;
    font-size: 12px;
    color: var(--ink);
    width: 100%;
    font-family: var(--font-text);
  }
  .search-input::placeholder {
    color: var(--ink-muted);
  }

  .msg-stream {
    flex: 1;
    overflow-y: auto;
  }
  .msg-row {
    padding: 12px 16px;
    border-bottom: 1px solid var(--hairline-soft);
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .msg-row:hover {
    background: #f7f7f9;
  }
  .msg-row.active {
    background: #f0f6ff;
    position: relative;
  }
  .msg-row.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    background: var(--primary);
    border-radius: 0 3px 3px 0;
  }
  .row-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .method-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 5px;
  }
  .m-POST { background: #e6f4ea; color: #137333; }
  .m-GET { background: #e8f0fe; color: #1a73e8; }
  .m-PUT { background: #fef7e0; color: #b06000; }
  .m-DELETE { background: #fce8e6; color: #c5221f; }
  .row-time {
    font-size: 11.5px;
    color: var(--ink-muted);
    font-family: var(--font-mono);
  }
  .row-bottom {
    font-size: 12px;
    color: var(--ink-muted);
    display: flex;
    justify-content: space-between;
  }
  .row-preview {
    font-size: 12px;
    color: var(--ink-muted-80);
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
  }

  /* Right Detail Pane */
  .pane-detail {
    flex: 1;
    background: var(--canvas);
    border-radius: 18px;
    border: 1px solid var(--hairline-soft);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: none;
  }
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--ink-muted);
    padding: 40px;
  }
  .empty-icon-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--canvas-parchment);
    margin-bottom: 16px;
    color: var(--primary);
  }
  .empty-h {
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.2px;
    margin-bottom: 8px;
  }
  .empty-p {
    font-size: 14px;
    line-height: 1.5;
    max-width: 440px;
    margin-bottom: 24px;
  }
  .test-snippet-box {
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline-soft);
    border-radius: 12px;
    padding: 14px 18px;
    text-align: left;
    max-width: 480px;
    width: 100%;
  }
  .test-snippet-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted-80);
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .test-snippet-code {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink);
    word-break: break-all;
  }
  .token-note {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--hairline-soft);
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--ink-muted);
    text-align: left;
  }
  .token-note code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--canvas);
    border: 1px solid var(--hairline-soft);
    border-radius: 4px;
    padding: 1px 5px;
  }

  /* Card Sections in Detail */
  .card-section {
    background: var(--canvas-parchment);
    border-radius: 14px;
    border: 1px solid var(--hairline-soft);
    padding: 16px;
    margin-bottom: 16px;
  }
  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .card-h-text {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.15px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 8px;
    font-size: 13px;
  }
  .meta-label {
    color: var(--ink-muted);
    font-weight: 500;
  }
  .meta-value {
    color: var(--ink);
    word-break: break-all;
    font-family: var(--font-mono);
    font-size: 12.5px;
  }

  /* Headers Table */
  .headers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    font-family: var(--font-mono);
  }
  .headers-table tr:not(:last-child) td {
    border-bottom: 1px solid var(--divider-soft);
  }
  .headers-table td {
    padding: 6px 8px;
    vertical-align: top;
  }
  .hdr-name {
    color: var(--primary);
    font-weight: 500;
    width: 32%;
    word-break: break-all;
  }
  .hdr-val {
    color: var(--ink);
    word-break: break-all;
  }

  /* macOS Terminal Frame */
  .terminal-box {
    background: var(--code-bg);
    border-radius: 12px;
    overflow: hidden;
    margin-top: 8px;
  }
  .terminal-topbar {
    background: #141416;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .terminal-dots {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .terminal-title {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: #a1a1aa;
  }
  pre.code-content {
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.55;
    color: #e4e4e7;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 480px;
  }

  /* Forwarding Receipts */
  .fwd-pill-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }
  .fwd-receipt {
    padding: 8px 12px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid var(--hairline-soft);
    color: var(--primary);
    font-family: var(--font-mono);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Apple Sheet Modal */
  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }
  .modal-overlay.show { display: flex; }
  .apple-sheet {
    background: #ffffff;
    width: 520px;
    max-width: 92vw;
    border-radius: 18px;
    overflow: hidden;
    animation: sheetIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes sheetIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .sheet-h {
    padding: 18px 22px;
    border-bottom: 1px solid var(--hairline-soft);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sheet-title {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sheet-close {
    background: var(--canvas-parchment);
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-muted);
    transition: background 0.15s, color 0.15s;
  }
  .sheet-close:hover {
    background: #e5e5ea;
    color: var(--ink);
  }
  .sheet-b {
    padding: 22px;
    max-height: 70vh;
    overflow-y: auto;
  }
  .form-group {
    margin-bottom: 16px;
  }
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
    letter-spacing: -0.1px;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .form-control {
    width: 100%;
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .form-control:focus {
    background: #ffffff;
    border-color: var(--primary);
  }
  .form-hint {
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-muted);
    margin-top: 6px;
  }

  /* 自定义下拉：原生 select 的面板由系统绘制，无法贴合设计规范 */
  .picker-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: var(--canvas-parchment);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .picker-trigger:hover { background: #ffffff; }
  .picker-trigger:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
  .picker.is-open .picker-trigger { background: #ffffff; border-color: var(--primary); }
  .picker-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-chevron { flex-shrink: 0; color: var(--ink-muted); transition: transform 0.2s; }
  .picker.is-open .picker-chevron { transform: rotate(180deg); }

  /* 浮层不做投影：靠表面色 + 背景模糊分层，与规范一致 */
  .picker-panel {
    position: fixed;
    z-index: 1100;
    overflow-y: auto;
    padding: 6px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border: 1px solid var(--hairline);
    border-radius: 12px;
  }
  .picker-group {
    padding: 8px 10px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-muted);
  }
  .picker-group:not(:first-child) {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid var(--hairline-soft);
  }
  .picker-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 40px;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--ink);
    cursor: pointer;
  }
  .picker-option.is-active { background: var(--canvas-parchment); }
  .picker-option.is-selected { color: var(--primary); }
  .picker-option-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-check { flex-shrink: 0; }
  .forwarder-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--canvas-parchment);
    padding: 10px 14px;
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid var(--hairline-soft);
  }
  .fwd-info-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
  }
  .fwd-info-url {
    font-size: 12px;
    color: var(--ink-muted);
    font-family: var(--font-mono);
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fwd-del-btn {
    background: transparent;
    border: none;
    color: #c5221f;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .fwd-del-btn:hover {
    background: #fce8e6;
  }
</style>
</head>
<body>
  <!-- Top Frosted Navigation -->
  <header class="sub-nav">
    <div class="nav-left">
      <a href="/" class="brand-chip" title="返回首页">
        <span class="brand-chip-icon">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8h13"/>
            <path d="m10 4-4 4 4 4"/>
            <path d="M18 16H5"/>
            <path d="m14 12 4 4-4 4"/>
          </svg>
        </span>
        <span>Inspector</span>
      </a>
      
      <div class="url-capsule">
        <span class="live-dot" title="实时监听中"></span>
        <span id="hook-url">\${hookUrl}</span>
        <button class="btn-capsule-copy" onclick="copyHook()" id="btn-copy-hook" title="复制可直接使用的完整推送地址（含访问令牌）">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>拷贝地址</span>
        </button>
      </div>
    </div>
    
    <div class="nav-right">
      <button class="btn-apple-secondary btn-apple-danger" onclick="destroyEndpoint()" title="永久删除该端点及其全部记录，推送地址立即失效">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>
        </svg>
        <span>注销端点</span>
      </button>

      <button class="btn-apple-secondary" onclick="openModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span>转发配置 (<span id="f-count">0</span>)</span>
      </button>

      <button class="btn-apple-secondary btn-apple-danger" onclick="clearMessages()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>清空消息</span>
      </button>

      <button class="btn-apple-secondary" onclick="logoutConsole()" title="清除本机登录状态，下次查看需要重新输入密码">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>锁定控制台</span>
      </button>

      <button class="btn-apple-action" onclick="location.href='/'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>新建端点</span>
      </button>
    </div>
  </header>

  <!-- Workspace Split Pane -->
  <main class="workspace">
    <!-- Left Sidebar: Event List -->
    <section class="pane-sidebar">
      <div class="side-h">
        <span class="side-h-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          接收队列
        </span>
        <span class="side-badge" id="count-tag">0 条</span>
      </div>

      <div class="side-filter-wrap">
        <div class="search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="search-input" id="search-filter" placeholder="搜索 Method、IP 或内容..." oninput="filterMessages()">
        </div>
      </div>

      <div class="msg-stream" id="msg-list">
        <div style="padding: 32px 20px; text-align: center; color: var(--ink-muted); font-size: 13px;">
          正在持续监听新请求...
        </div>
      </div>
    </section>

    <!-- Right Detail Pane -->
    <section class="pane-detail">
      <!-- Empty State -->
      <div class="empty-state" id="empty-hint">
        <div class="empty-icon-box">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
          </svg>
        </div>
        <h3 class="empty-h">端点已就绪，等待传入请求</h3>
        <p class="empty-p">将上方的专属 Webhook 地址填入外部业务系统、告警组件或集成后台中。任何到达此端点的 HTTP 请求都将毫秒级在左侧队列与此面板展现。</p>
        
        <div class="test-snippet-box">
          <div class="test-snippet-title">
            <span>快速测试示例 (cURL)</span>
            <button class="btn-apple-secondary" style="padding: 2px 8px; font-size: 11px;" onclick="copyCurlTest()">拷贝</button>
          </div>
          <div class="test-snippet-code" id="curl-cmd">curl -X POST "\${hookUrl}" -H "Content-Type: application/json" -d '{"event":"test","message":"Hello Webhook"}'</div>
          <div class="token-note" id="token-note"></div>
        </div>
      </div>

      <!-- Detail Body (Selected Message) -->
      <div class="detail-body" id="detail-box">
        <!-- Card 1: Overview -->
        <div class="card-section">
          <div class="card-title-row">
            <span class="card-h-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              请求概览
            </span>
            <span style="font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono);" id="d-time"></span>
          </div>
          <div class="meta-grid" id="d-meta"></div>
        </div>

        <!-- Card 2: Headers -->
        <div class="card-section" id="card-headers">
          <div class="card-title-row">
            <span class="card-h-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6h16"/>
                <path d="M4 12h16"/>
                <path d="M4 18h12"/>
              </svg>
              请求头 (Request Headers)
            </span>
            <button class="btn-apple-secondary" style="font-size:12px; padding:3px 10px;" onclick="copyHeaders()">拷贝 Headers</button>
          </div>
          <div style="overflow-x: auto;">
            <table class="headers-table" id="d-headers-table"></table>
          </div>
        </div>

        <!-- Card 3: Query Params (Optional) -->
        <div class="card-section" id="card-query" style="display:none;">
          <div class="card-title-row">
            <span class="card-h-text">URL 查询参数 (Query Parameters)</span>
          </div>
          <div class="meta-grid" id="d-query"></div>
        </div>

        <!-- Card 4: Raw Payload -->
        <div class="card-section" style="background:#ffffff; border:none; padding:0;">
          <div class="card-title-row" style="margin-bottom: 8px;">
            <span class="card-h-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              原始载荷 (Raw Payload)
            </span>
            <div style="display:flex; gap:6px;">
              <button class="btn-apple-secondary" style="font-size:12px; padding:4px 10px;" onclick="toggleFormat()" id="btn-toggle-json">格式化 JSON</button>
              <button class="btn-apple-secondary" style="font-size:12px; padding:4px 10px;" onclick="copyRaw()">拷贝原文</button>
            </div>
          </div>
          <div class="terminal-box">
            <div class="terminal-topbar">
              <div class="terminal-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <span class="terminal-title" id="terminal-filename">payload.raw</span>
            </div>
            <pre class="code-content" id="d-raw"></pre>
          </div>
        </div>

        <!-- Card 5: Forwarding Receipts -->
        <div class="card-section" id="card-fwd" style="display:none; margin-top:16px;">
          <div class="card-title-row">
            <span class="card-h-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              协同转发回执
            </span>
          </div>
          <div class="fwd-pill-list" id="d-fwd"></div>
        </div>
      </div>
    </section>
  </main>

  <!-- Forwarder Modal Sheet -->
  <div class="modal-overlay" id="f-modal">
    <div class="apple-sheet">
      <div class="sheet-h">
        <span class="sheet-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          转发目标与推送渠道
        </span>
        <button class="sheet-close" onclick="closeModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sheet-b">
        <div style="margin-bottom: 20px;">
          <span class="form-label">生效中的转发目标 <span id="f-quota" style="color:var(--ink-muted); font-weight:400;"></span></span>
          <div id="f-list" style="margin-top: 8px;">
            <div style="color:var(--ink-muted); font-size:13px;">暂未添加转发目标</div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--hairline-soft); padding-top: 18px;">
          <span class="form-label">添加新目标</span>
          <div class="form-hint" id="f-cap"></div>
          
          <div class="form-group" style="margin-top:10px;">
            <span class="form-label" id="f-type-label">适配平台</span>
            <input type="hidden" id="f-type" value="wecom">
            <div class="picker" id="f-picker">
              <button type="button" class="picker-trigger" id="f-picker-trigger"
                      aria-haspopup="listbox" aria-expanded="false" aria-controls="f-picker-panel"
                      aria-labelledby="f-type-label" onclick="togglePicker()" onkeydown="pickerTriggerKey(event)">
                <span class="picker-value" id="f-picker-label">企业微信 · 群机器人</span>
                <svg class="picker-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">规则名称 / 备注</label>
            <input type="text" class="form-control" id="f-name" placeholder="例如：SRE 核心告警群">
          </div>

          <div class="form-group">
            <label class="form-label">目标 Webhook 地址</label>
            <input type="text" class="form-control" id="f-url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...">
            <div class="form-hint" id="f-hint"></div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
            <button class="btn-apple-secondary" onclick="closeModal()">取消</button>
            <button class="btn-apple-action" id="f-save" onclick="saveForwarder()">保存并启用</button>
          </div>
        </div>
      </div>
    </div>
  </div>

<script>
const BIN_ID = "\${binId}";

// 密码 = 控制台登录口令 = 推送令牌。创建或登录时写入 sessionStorage，
// 只用来在本地拼出可直接使用的推送地址；页面文本刻意不显示令牌本身，
// 这样截图、投屏、共享屏幕都不会连带泄露。
const WH_TOKEN = (function () {
  try {
    const pending = sessionStorage.getItem('wh_pending_pwd');
    if (pending) {
      sessionStorage.setItem('wh_token_' + BIN_ID, pending);
      sessionStorage.removeItem('wh_pending_pwd');
      return pending;
    }
    return sessionStorage.getItem('wh_token_' + BIN_ID) || '';
  } catch (e) {
    return '';
  }
})();

const HOOK_BASE = (document.getElementById('hook-url').innerText || '').trim();

function pushUrl() {
  return WH_TOKEN ? HOOK_BASE + '?token=' + encodeURIComponent(WH_TOKEN) : HOOK_BASE;
}

const UTF8 = new TextEncoder();

let messages = [];
let forwarders = [];
let forwardLimit = 10;
let currentMsg = null;
let isFormatted = false;

// D1 stores created_at as UTC "YYYY-MM-DD HH:MM:SS"; render in the viewer's local timezone.
function toLocalDate(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

function fmtTime(s) {
  const d = toLocalDate(s);
  if (!d) return String(s || '').split(' ')[1] || '';
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateTime(s) {
  const d = toLocalDate(s);
  if (!d) return String(s || '');
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
         pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' 本地时间';
}

function copyHook() {
  const url = pushUrl();
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-copy-hook');
    btn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#34c759;"><polyline points="20 6 9 17 4 12"/></svg><span>已复制</span>\`;
    setTimeout(() => {
      btn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>拷贝地址</span>\`;
    }, 2000);
  });
}

function copyCurlTest() {
  const cmd = document.getElementById('curl-cmd').innerText;
  navigator.clipboard.writeText(cmd);
}

function copyRaw() {
  if (currentMsg) {
    navigator.clipboard.writeText(currentMsg.raw_body);
  }
}

function copyHeaders() {
  if (currentMsg && currentMsg.headers) {
    navigator.clipboard.writeText(currentMsg.headers);
  }
}

function toggleFormat() {
  if (!currentMsg) return;
  const rawEl = document.getElementById('d-raw');
  const btn = document.getElementById('btn-toggle-json');
  const fn = document.getElementById('terminal-filename');
  if (!isFormatted) {
    try {
      const obj = JSON.parse(currentMsg.raw_body);
      rawEl.textContent = JSON.stringify(obj, null, 2);
      btn.textContent = '原始文本';
      fn.textContent = 'payload.json';
      isFormatted = true;
    } catch (e) {
      alert('内容不是有效的 JSON 格式');
    }
  } else {
    rawEl.textContent = currentMsg.raw_body;
    btn.textContent = '格式化 JSON';
    fn.textContent = 'payload.raw';
    isFormatted = false;
  }
}

// 会话 Cookie 过期或在新标签页丢失时，回到登录页而不是静默空转
function ensureAuth(res) {
  if (res.status === 401) {
    location.href = '/view/' + BIN_ID;
    return false;
  }
  return true;
}

function hydratePushTargets() {
  const curlEl = document.getElementById('curl-cmd');
  if (curlEl && WH_TOKEN) {
    curlEl.innerText = curlEl.innerText.split(HOOK_BASE).join(pushUrl());
  }
  const note = document.getElementById('token-note');
  if (!note) return;
  note.innerHTML = WH_TOKEN
    ? '推送地址已自动带上令牌，上面的示例可直接执行；带令牌的完整地址等同于密码，请勿贴进群聊、工单或公开仓库。'
    : '当前标签页没有缓存令牌（可能是在别的标签页登录的）。请在地址末尾手动追加 <code>?token=你的密码</code>，或改用 <code>X-Webhook-Token</code> 请求头携带密码。';
}

async function loadData() {
  try {
    const res = await fetch('/api/' + BIN_ID + '/events');
    if (!ensureAuth(res)) return;
    const data = await res.json();
    messages = data.messages || [];
    renderList();
  } catch (err) {
    console.error('加载事件失败', err);
  }
}

// 免费版每次 hook 调用只有 50 个子请求，转发规则必须封顶；上限由接口下发
function syncForwarderQuota(limit) {
  if (limit) forwardLimit = limit;
  const full = forwarders.length >= forwardLimit;
  const quota = document.getElementById('f-quota');
  if (quota) quota.textContent = forwarders.length + ' / ' + forwardLimit;
  const btn = document.getElementById('f-save');
  if (btn) {
    btn.disabled = full;
    btn.title = full ? ('每个端点最多 ' + forwardLimit + ' 条转发规则') : '';
  }
  const cap = document.getElementById('f-cap');
  if (cap) {
    cap.textContent = full
      ? ('已达上限 ' + forwardLimit + ' 条，如需新增请先删除一条。')
      : ('每条消息会逐条转发到以上目标，最多 ' + forwardLimit + ' 条。');
  }
}

async function loadForwarders() {
  try {
    const res = await fetch('/api/' + BIN_ID + '/forwarders');
    if (!ensureAuth(res)) return;
    const data = await res.json();
    forwarders = data.forwarders || [];
    document.getElementById('f-count').textContent = forwarders.length;
    renderForwarderList();
    syncForwarderQuota(data.limit);
  } catch (err) {
    console.error('加载转发器失败', err);
  }
}

function filterMessages() {
  renderList();
}

function renderList() {
  const listEl = document.getElementById('msg-list');
  const countEl = document.getElementById('count-tag');
  const q = (document.getElementById('search-filter') ? document.getElementById('search-filter').value.trim().toLowerCase() : '');

  const filtered = messages.filter(m => {
    if (!q) return true;
    return (m.method && m.method.toLowerCase().includes(q)) ||
           (m.client_ip && m.client_ip.includes(q)) ||
           (m.raw_body && m.raw_body.toLowerCase().includes(q));
  });

  countEl.textContent = filtered.length + ' 条';

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding: 32px 20px; text-align: center; color: var(--ink-muted); font-size: 13px;">' +
      (messages.length === 0 ? '正在持续监听新请求...' : '无匹配的筛选结果') + '</div>';
    return;
  }

  let html = '';
  filtered.forEach(m => {
    const active = (currentMsg && currentMsg.id === m.id) ? 'active' : '';
    const timeStr = fmtTime(m.created_at);
    const preview = (m.raw_body || '').trim().replace(/\\s+/g, ' ').slice(0, 48);
    html += \`
      <div class="msg-row \${active}" onclick="selectMsg(\${m.id})">
        <div class="row-top">
          <span class="method-badge m-\${m.method}">\${m.method}</span>
          <span class="row-time">\${timeStr}</span>
        </div>
        <div class="row-bottom">
          <span>\${m.client_ip || '未知 IP'}</span>
          <span>\${m.raw_body ? m.raw_body.length + ' B' : '0 B'}</span>
        </div>
        <div class="row-preview">\${preview ? escapeHtml(preview) : '空载荷'}</div>
      </div>
    \`;
  });
  listEl.innerHTML = html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function selectMsg(id) {
  currentMsg = messages.find(m => m.id === id);
  if (!currentMsg) return;
  renderList();

  document.getElementById('empty-hint').style.display = 'none';
  document.getElementById('detail-box').style.display = 'block';

  document.getElementById('d-time').textContent = fmtDateTime(currentMsg.created_at);
  
  // Meta：按 UTF-8 字节计算，口径与入库上限、截断标注一致
  const bodyBytes = currentMsg.raw_body ? UTF8.encode(currentMsg.raw_body).length : 0;
  document.getElementById('d-meta').innerHTML = \`
    <span class="meta-label">请求方法</span><span class="meta-value">\${currentMsg.method}</span>
    <span class="meta-label">来源 IP</span><span class="meta-value">\${currentMsg.client_ip || '未知'}</span>
    <span class="meta-label">载荷大小</span><span class="meta-value">\${bodyBytes} 字节</span>
  \`;

  // Headers Table
  let hdrsHtml = '';
  try {
    const hObj = JSON.parse(currentMsg.headers || '{}');
    for (const [k, v] of Object.entries(hObj)) {
      hdrsHtml += \`<tr><td class="hdr-name">\${escapeHtml(k)}</td><td class="hdr-val">\${escapeHtml(String(v))}</td></tr>\`;
    }
  } catch (e) {
    hdrsHtml = \`<tr><td colspan="2" class="hdr-val">\${escapeHtml(currentMsg.headers || '')}</td></tr>\`;
  }
  document.getElementById('d-headers-table').innerHTML = hdrsHtml || '<tr><td colspan="2" style="color:var(--ink-muted);">无请求头</td></tr>';

  // Query Params
  const qCard = document.getElementById('card-query');
  if (currentMsg.query_params && currentMsg.query_params.length > 1) {
    qCard.style.display = 'block';
    document.getElementById('d-query').innerHTML = \`
      <span class="meta-label">原始 Query</span><span class="meta-value">\${escapeHtml(currentMsg.query_params)}</span>
    \`;
  } else {
    qCard.style.display = 'none';
  }

  // Raw
  isFormatted = false;
  document.getElementById('btn-toggle-json').textContent = '格式化 JSON';
  document.getElementById('terminal-filename').textContent = 'payload.raw';
  document.getElementById('d-raw').textContent = currentMsg.raw_body || '(空载荷)';

  // Forwarding Logs
  const fwdCard = document.getElementById('card-fwd');
  if (currentMsg.forward_logs) {
    fwdCard.style.display = 'block';
    const lines = currentMsg.forward_logs.split('\\n');
    document.getElementById('d-fwd').innerHTML = lines.map(l => 
      \`<div class="fwd-receipt">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>\${escapeHtml(l)}</span>
      </div>\`
    ).join('');
  } else {
    fwdCard.style.display = 'none';
  }
}

async function clearMessages() {
  if (!confirm('确定要清空当前端点的所有历史接收记录吗？')) return;
  await fetch('/api/' + BIN_ID + '/clear', { method: 'POST' });
  currentMsg = null;
  document.getElementById('detail-box').style.display = 'none';
  document.getElementById('empty-hint').style.display = 'flex';
  await loadData();
}

// 主动丢弃会话：清掉本机缓存令牌并作废 Cookie，回到需要密码的登录页
function logoutConsole() {
  if (!confirm('锁定后需要重新输入密码才能查看这个端点，确定继续吗？')) return;
  try { sessionStorage.removeItem('wh_token_' + BIN_ID); } catch (e) {}
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = '/api/' + BIN_ID + '/logout';
  document.body.appendChild(f);
  f.submit();
}

// 注销端点：不可恢复，二次确认后才提交
function destroyEndpoint() {
  if (!confirm('注销端点 ' + BIN_ID + '？\\n\\n该端点、它收到的全部报文与转发规则会被立即永久删除，推送地址随即失效。')) return;
  if (!confirm('再次确认：此操作不可恢复，删除后无法找回任何数据。\\n\\n确定要继续吗？')) return;
  try { sessionStorage.removeItem('wh_token_' + BIN_ID); } catch (e) {}
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = '/api/' + BIN_ID + '/destroy';
  document.body.appendChild(f);
  f.submit();
}

// 各渠道的目标地址形态差别很大，选平台时同步给出示例与获取路径
const FORWARD_PRESETS = {
  wecom: { url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...', hint: '企业微信群 → 群机器人 → 添加机器人，复制 Webhook 地址。' },
  dingtalk: { url: 'https://oapi.dingtalk.com/robot/send?access_token=...', hint: '钉钉群 → 群设置 → 智能群助手 → 添加机器人 → 自定义。' },
  feishu: { url: 'https://open.feishu.cn/open-apis/bot/v2/hook/...', hint: '飞书群 → 设置 → 群机器人 → 添加机器人 → 自定义机器人。' },
  telegram: { url: 'https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>', hint: '找 @BotFather 创建机器人拿 token，chat_id 用 @userinfobot 查，两者拼进地址。' },
  discord: { url: 'https://discord.com/api/webhooks/<ID>/<TOKEN>', hint: '频道 → 编辑频道 → 整合 → Webhook → 新建 → 复制 Webhook URL。' },
  slack: { url: 'https://hooks.slack.com/services/...', hint: 'Slack 应用的 Incoming Webhook；Mattermost / Rocket.Chat 的 Slack 兼容入口也可直接用。' },
  ntfy: { url: 'https://ntfy.sh/<你的主题>', hint: '主题名直接写在地址里，无需注册；自建服务换成你自己的域名。' },
  bark: { url: 'https://api.day.app/<你的KEY>', hint: 'Bark App 首页显示专属 Key；自建服务换成你的域名。' },
  gotify: { url: 'https://<你的域名>/message?token=<APP_TOKEN>', hint: 'Gotify 后台 → Apps → 创建应用 → 复制 token，拼进地址。' },
  serverchan: { url: 'https://sctapi.ftqq.com/<SENDKEY>.send', hint: 'Server 酱后台复制 SendKey，替换地址里的 <SENDKEY>。' },
  raw: { url: 'https://your-endpoint.example.com/hook', hint: '把收到的原始报文原封不动 POST 过去，不做任何封装。' }
};

// 渠道清单（分组）—— 页面下拉、列表标签都以这里为唯一来源
const FORWARD_CHOICES = [
  ['群机器人', [
    ['wecom', '企业微信 · 群机器人'],
    ['dingtalk', '钉钉 · 群机器人'],
    ['feishu', '飞书 · 自定义机器人'],
    ['telegram', 'Telegram · Bot'],
    ['discord', 'Discord · Webhook'],
    ['slack', 'Slack · Incoming Webhook']
  ]],
  ['推送渠道', [
    ['ntfy', 'ntfy（含自建服务）'],
    ['bark', 'Bark（iOS 推送）'],
    ['gotify', 'Gotify（自建推送）'],
    ['serverchan', 'Server 酱']
  ]],
  ['通用', [
    ['raw', '原样透传 · 自定义 Webhook']
  ]]
];

const FORWARD_LABELS = {};
FORWARD_CHOICES.forEach(function (group) {
  group[1].forEach(function (item) { FORWARD_LABELS[item[0]] = item[1]; });
});

const PICKER_TICK = '<svg class="picker-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

let pickerRows = [];
let pickerIndex = -1;
let pickerTyped = '';
let pickerTypedTimer = null;

function pickerValue() {
  return document.getElementById('f-type').value;
}

function setPickerValue(value) {
  document.getElementById('f-type').value = value;
  const label = document.getElementById('f-picker-label');
  if (label) label.textContent = FORWARD_LABELS[value] || value;
}

function buildPickerPanel() {
  const current = pickerValue();
  const panel = document.createElement('div');
  panel.className = 'picker-panel';
  panel.id = 'f-picker-panel';
  panel.setAttribute('role', 'listbox');
  let html = '';
  FORWARD_CHOICES.forEach(function (group) {
    html += '<div class="picker-group" role="presentation">' + group[0] + '</div>';
    group[1].forEach(function (item) {
      const selected = item[0] === current;
      html += '<div class="picker-option' + (selected ? ' is-selected' : '') + '"'
        + ' role="option" id="f-opt-' + item[0] + '" data-value="' + item[0] + '"'
        + ' aria-selected="' + (selected ? 'true' : 'false') + '">'
        + '<span class="picker-option-text">' + item[1] + '</span>'
        + (selected ? PICKER_TICK : '')
        + '</div>';
    });
  });
  panel.innerHTML = html;
  Array.prototype.forEach.call(panel.querySelectorAll('.picker-option'), function (row) {
    row.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    row.addEventListener('click', function () { choosePicker(row.dataset.value); });
  });
  return panel;
}

// 面板固定在 body 上：弹窗是 overflow:hidden，挂在里面会被裁掉
function positionPickerPanel() {
  const panel = document.getElementById('f-picker-panel');
  const trigger = document.getElementById('f-picker-trigger');
  if (!panel || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  const gap = 6;
  const limit = Math.min(340, Math.max(160, window.innerHeight - rect.bottom - gap - 12));
  panel.style.left = rect.left + 'px';
  panel.style.width = rect.width + 'px';
  panel.style.maxHeight = limit + 'px';
  const height = Math.min(panel.scrollHeight, limit);
  const flip = rect.bottom + gap + height > window.innerHeight - 12 && rect.top - gap - height > 12;
  panel.style.top = (flip ? rect.top - gap - height : rect.bottom + gap) + 'px';
}

function paintPickerCursor() {
  pickerRows.forEach(function (row, i) { row.classList.toggle('is-active', i === pickerIndex); });
}

function onPickerOutside(ev) {
  const panel = document.getElementById('f-picker-panel');
  const wrap = document.getElementById('f-picker');
  if (panel && panel.contains(ev.target)) return;
  if (wrap && wrap.contains(ev.target)) return;
  closePicker();
}

function onPickerKey(ev) {
  if (!pickerRows.length) return;
  if (ev.key === 'Escape') {
    ev.preventDefault();
    closePicker();
    document.getElementById('f-picker-trigger').focus();
    return;
  }
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    const step = ev.key === 'ArrowDown' ? 1 : -1;
    pickerIndex = (pickerIndex + step + pickerRows.length) % pickerRows.length;
    paintPickerCursor();
    pickerRows[pickerIndex].scrollIntoView({ block: 'nearest' });
    return;
  }
  if (ev.key === 'Home' || ev.key === 'End') {
    ev.preventDefault();
    pickerIndex = ev.key === 'Home' ? 0 : pickerRows.length - 1;
    paintPickerCursor();
    pickerRows[pickerIndex].scrollIntoView({ block: 'nearest' });
    return;
  }
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    if (pickerIndex >= 0) choosePicker(pickerRows[pickerIndex].dataset.value);
    return;
  }
  if (ev.key === 'Tab') { closePicker(); return; }
  if (ev.key.length === 1) {
    pickerTyped += ev.key.toLowerCase();
    clearTimeout(pickerTypedTimer);
    pickerTypedTimer = setTimeout(function () { pickerTyped = ''; }, 600);
    const hit = pickerRows.findIndex(function (row) {
      return row.textContent.toLowerCase().indexOf(pickerTyped) === 0;
    });
    if (hit >= 0) {
      pickerIndex = hit;
      paintPickerCursor();
      pickerRows[hit].scrollIntoView({ block: 'nearest' });
    }
  }
}

function openPicker() {
  if (document.getElementById('f-picker-panel')) return;
  const panel = buildPickerPanel();
  document.body.appendChild(panel);
  document.getElementById('f-picker').classList.add('is-open');
  document.getElementById('f-picker-trigger').setAttribute('aria-expanded', 'true');
  pickerRows = Array.prototype.slice.call(panel.querySelectorAll('.picker-option'));
  const selected = pickerRows.findIndex(function (row) { return row.classList.contains('is-selected'); });
  pickerIndex = selected >= 0 ? selected : 0;
  paintPickerCursor();
  pickerRows[pickerIndex].scrollIntoView({ block: 'nearest' });
  positionPickerPanel();
  document.addEventListener('mousedown', onPickerOutside, true);
  document.addEventListener('keydown', onPickerKey, true);
  window.addEventListener('resize', positionPickerPanel);
  window.addEventListener('scroll', positionPickerPanel, true);
}

function closePicker() {
  const panel = document.getElementById('f-picker-panel');
  if (panel) panel.remove();
  const wrap = document.getElementById('f-picker');
  if (wrap) wrap.classList.remove('is-open');
  const trigger = document.getElementById('f-picker-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  pickerRows = [];
  pickerIndex = -1;
  pickerTyped = '';
  document.removeEventListener('mousedown', onPickerOutside, true);
  document.removeEventListener('keydown', onPickerKey, true);
  window.removeEventListener('resize', positionPickerPanel);
  window.removeEventListener('scroll', positionPickerPanel, true);
}

function togglePicker() {
  if (document.getElementById('f-picker-panel')) closePicker();
  else openPicker();
}

function pickerTriggerKey(ev) {
  if (document.getElementById('f-picker-panel')) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    openPicker();
  }
}

function choosePicker(value) {
  setPickerValue(value);
  closePicker();
  syncForwarderHint();
  document.getElementById('f-picker-trigger').focus();
}

function syncForwarderHint() {
  const preset = FORWARD_PRESETS[pickerValue()] || { url: '', hint: '' };
  const urlEl = document.getElementById('f-url');
  urlEl.placeholder = preset.url;
  urlEl.value = '';
  document.getElementById('f-hint').textContent = preset.hint;
}

function openModal() {
  closePicker();
  setPickerValue(pickerValue() || 'wecom');
  syncForwarderHint();
  syncForwarderQuota();
  document.getElementById('f-modal').classList.add('show');
}
function closeModal() { closePicker(); document.getElementById('f-modal').classList.remove('show'); }

function renderForwarderList() {
  const el = document.getElementById('f-list');
  if (forwarders.length === 0) {
    el.innerHTML = '<div style="color:var(--ink-muted); font-size:13px;">暂未添加任何转发目标</div>';
    return;
  }
  el.innerHTML = forwarders.map(f => \`
    <div class="forwarder-card">
      <div>
        <div class="fwd-info-title">\${escapeHtml(f.name)} <span style="font-size:11px; font-weight:normal; color:var(--ink-muted);">(\${FORWARD_LABELS[f.forward_type] || f.forward_type})</span></div>
        <div class="fwd-info-url">\${escapeHtml(f.target_url)}</div>
      </div>
      <button class="fwd-del-btn" onclick="deleteForwarder(\${f.id})">删除</button>
    </div>
  \`).join('');
}

async function saveForwarder() {
  const name = document.getElementById('f-name').value.trim();
  const url = document.getElementById('f-url').value.trim();
  const type = document.getElementById('f-type').value;
  if (!name || !url) {
    alert('请填写规则名称与 Webhook 地址');
    return;
  }
  if (forwarders.length >= forwardLimit) {
    alert('每个端点最多 ' + forwardLimit + ' 条转发规则，请先删除一条');
    return;
  }
  const res = await fetch('/api/' + BIN_ID + '/forwarders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, target_url: url, forward_type: type })
  });
  if (!res.ok) {
    const data = await res.json().catch(function () { return {}; });
    alert(data.error === 'forwarder limit reached'
      ? ('每个端点最多 ' + forwardLimit + ' 条转发规则')
      : '保存失败，请检查网络后重试');
    await loadForwarders();
    return;
  }
  document.getElementById('f-name').value = '';
  document.getElementById('f-url').value = '';
  await loadForwarders();
}

async function deleteForwarder(id) {
  if (!confirm('确定删除该转发规则吗？')) return;
  await fetch('/api/' + BIN_ID + '/forwarders/' + id, { method: 'DELETE' });
  await loadForwarders();
}

hydratePushTargets();
loadData();
loadForwarders();
setInterval(loadData, 2500);
</script>
</body>
</html>
`;

﻿// ======================= 访问控制工具 =======================
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
