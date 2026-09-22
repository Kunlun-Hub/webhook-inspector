# -*- coding: utf-8 -*-
"""\u6d4f\u89c8\u5668\u7ea7\u9a8c\u6536\uff1a\u9996\u9875\u6539\u7248\u3001\u65b0\u63a8\u9001\u6e20\u9053\u3001\u6ce8\u9500\u7aef\u70b9"""
import json
import re
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"D:\cf-webhook-bin")
from cdp import Chrome

BASE = "http://127.0.0.1:8787"
PASSWORD = "Feature-Pass-2026"
checks = []


def expect(name, cond, detail=""):
    checks.append((name, bool(cond), detail))


def req(method, path, body=None, headers=None):
    h = dict(headers or {})
    data = None
    if isinstance(body, str):
        data = body.encode()
        h["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), dict(e.headers)


c = Chrome(port=9340, width=1440, height=900, profile=r"D:\cf-webhook-bin\.chrome-qa-feat")
c.cdp("Network.enable")

# ---------- 1. 首页：锚点移除 + 主标题一行 ----------
c.goto(BASE + "/")
c.wait_for("document.readyState === 'complete'")
expect("nav has no anchor links", c.js("document.querySelectorAll('.nav-link, .nav-links').length") == 0)
title_lines = c.js("(function(){var el=document.querySelector('.hero-title');"
                   "if(!el)return -1;var lh=parseFloat(getComputedStyle(el).lineHeight);"
                   "return Math.round(el.getBoundingClientRect().height/lh);})()")
expect("hero title occupies exactly one line", title_lines == 1, "lines=%s" % title_lines)
expect("hero title text merged", c.js("document.querySelector('.hero-title').innerText").replace("\n", "") ==
       "透视每一次回调，连接每一个工作流。", repr(c.js("document.querySelector('.hero-title').innerText")))
expect("hero title does not overflow", c.js("(function(){var el=document.querySelector('.hero-title');"
       "return el.scrollWidth <= el.clientWidth + 1;})()"))
doc_h = c.js("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
vp = c.js("window.innerHeight")
expect("home still fits one screen", doc_h <= vp + 4, "doc=%s vp=%s" % (doc_h, vp))
p, s = c.shot("home_fold.png")
print("home_fold.png %s bytes (doc=%s vp=%s)" % (s, doc_h, vp))

# ---------- 1b. 首页统计条：累计量 + 当日额度余量 ----------
# 注意：服务端把统计计数在内存里攒批（最多 20 秒一次落库），
# 所以页面拉到的值可能略低于刚刚抨过的接口值，这里只断言「不会偏高」。
st, body, hdr = req("GET", "/api/stats")
live = json.loads(body)
expect("stats endpoint answers the homepage", st == 200 and live.get("ok") is True, body[:90])
expect("stats is cacheable for a minute", "max-age=60" in (hdr.get("Cache-Control") or ""), hdr.get("Cache-Control"))
expect("stats is labelled self-measured", live.get("measured") == "self", str(live.get("measured")))
expect("stats publishes the free-tier ceilings",
       live.get("limits") == {"requests": 100000, "d1_reads": 5000000, "d1_writes": 100000}, str(live.get("limits")))
expect("stat strip renders four cells", c.js("document.querySelectorAll('#stat-strip .stat-cell').length") == 4)
expect("the strip sits above the headline",
       c.js("(function(){var a=document.getElementById('stat-strip'),b=document.querySelector('.hero-title');"
            "return !!(a&&b)&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)>0;})()"))
c.wait_for("document.getElementById('st-received').innerText.trim() !== '\u2014'", timeout=15)


def cell(key):
    return (c.js("document.getElementById('st-%s').innerText" % key) or "").strip()


rendered = dict((k, cell(k)) for k in ("received", "forwarded", "workers", "d1"))
PCT = re.compile(r"^(\d+(\.\d)?%|<0\.1%)$")
expect("the counters load live numbers",
       rendered["received"].replace(",", "").isdigit() and rendered["forwarded"].replace(",", "").isdigit(),
       repr(rendered))
expect("the quota cells show a percentage instead of a number",
       PCT.match(rendered["workers"]) is not None and PCT.match(rendered["d1"]) is not None, repr(rendered))
_strip_text = c.js("document.getElementById('stat-strip').innerText") or ""
expect("the strip never prints the raw quota numbers",
       "100,000" not in _strip_text and "100000" not in _strip_text
       and str(live["limits"]["d1_writes"]) not in _strip_text.replace(",", ""), repr(_strip_text))
expect("the strip is fed by the stats API",
       int(rendered["received"].replace(",", "")) <= live["received"]
       and int(rendered["forwarded"].replace(",", "")) <= live["forwarded"],
       "dom=%s api=%s" % (rendered, live))
expect("both bars are filled from the live quota",
       (c.js("document.getElementById('st-workers-bar').style.width") or "").endswith("%")
       and (c.js("document.getElementById('st-d1-bar').style.width") or "").endswith("%"),
       c.js("document.getElementById('st-workers-bar').style.width"))

# 用固定报文验证渲染口径：百分比取整、进度条宽度、见底归零、阈值变色
# loadStats() 不返回 Promise，所以每次都等一下再取 DOM
stubbed = c.js(
    "(async function(){"
    "var real=window.fetch;"
    "function fake(u){window.fetch=function(){return Promise.resolve({json:function(){return Promise.resolve(u);}});};}"
    "function snap(){var w=document.getElementById('st-workers'),d=document.getElementById('st-d1'),"
    "wb=document.getElementById('st-workers-bar'),db=document.getElementById('st-d1-bar');"
    "return {received:document.getElementById('st-received').innerText,"
    "forwarded:document.getElementById('st-forwarded').innerText,"
    "workers:w.innerText,d1:d.innerText,workersCls:w.className,d1Cls:d.className,"
    "workersWidth:wb.style.width,d1Width:db.style.width,workersBarCls:wb.className,d1BarCls:db.className};}"
    "function tick(){return new Promise(function(r){setTimeout(r,320);});}"
    "fake({ok:true,received:1234,forwarded:56,usage:{requests:800,d1_reads:1000,d1_writes:2000},"
    "limits:{requests:100000,d1_reads:5000000,d1_writes:100000}});"
    "loadStats();await tick();var out=snap();"
    "fake({ok:true,received:9,forwarded:9,usage:{requests:85000,d1_reads:0,d1_writes:96000},"
    "limits:{requests:100000,d1_reads:5000000,d1_writes:100000}});"
    "loadStats();await tick();var low=snap();"
    "fake({ok:true,received:9,forwarded:9,usage:{requests:120000,d1_reads:0,d1_writes:999999},"
    "limits:{requests:100000,d1_reads:5000000,d1_writes:100000}});"
    "loadStats();await tick();var spent=snap();"
    "out.low=low;out.overuse=spent.workers+'/'+spent.d1+' '+spent.workersCls+'/'+spent.d1Cls;"
    "window.fetch=real;return out;})()")
expect("the strip formats totals with thousands separators",
       stubbed.get("received") == "1,234" and stubbed.get("forwarded") == "56", repr(stubbed)[:200])
expect("a healthy quota reads as a percentage",
       stubbed.get("workers") == "99.2%" and stubbed.get("d1") == "98.0%", repr(stubbed)[:200])
def bar_pct(value):
    """把 style.width 读回的 '99.2%' 转成数值（CSSOM 会把 99.20% 规范化成 99.2%）"""
    text = str(value or "")
    try:
        return float(text[:-1]) if text.endswith("%") else -1.0
    except ValueError:
        return -1.0


expect("the bar width equals the remaining share",
       abs(bar_pct(stubbed.get("workersWidth")) - 99.2) < 0.02
       and abs(bar_pct(stubbed.get("d1Width")) - 98.0) < 0.02
       and stubbed.get("workersBarCls") == "stat-bar-fill" and stubbed.get("workersCls") == "stat-num",
       "%s / %s" % (stubbed.get("workersWidth"), stubbed.get("d1Width")))
expect("the bar of a low quota narrows down",
       abs(bar_pct((stubbed.get("low") or {}).get("workersWidth")) - 15.0) < 0.02,
       repr((stubbed.get("low") or {}).get("workersWidth")))
_low = stubbed.get("low") or {}
expect("a low quota turns amber",
       _low.get("workers") == "15.0%" and _low.get("workersCls") == "stat-num is-warn"
       and _low.get("workersBarCls") == "stat-bar-fill is-warn", repr(_low.get("workersCls")))
expect("a nearly spent quota turns red",
       _low.get("d1") == "4.0%" and _low.get("d1Cls") == "stat-num is-danger"
       and _low.get("d1BarCls") == "stat-bar-fill is-danger", repr(_low.get("d1Cls")))
expect("an exhausted quota floors at zero",
       stubbed.get("overuse", "").startswith("0%/0%") and "is-danger" in stubbed.get("overuse", ""),
       repr(stubbed.get("overuse")))
note = c.js("document.querySelector('.stat-note').innerText") or ""
expect("the note states the Beijing reset hour", "08:00" in note, repr(note))
expect("the note calls the numbers self-measured", "\u81ea\u8ba1" in note, repr(note))
expect("the stat strip is flat", c.js("getComputedStyle(document.getElementById('stat-strip')).boxShadow") == "none",
       c.js("getComputedStyle(document.getElementById('stat-strip')).boxShadow"))
c.js("loadStats()")
c.wait_for("document.getElementById('st-received').innerText.trim() !== '\u2014'", timeout=15)
c.shot("home_stats.png")

# ---------- 2. \u4e0b\u6d4b\u63a7\u5236\u53f0\uff1a\u7528 cookie \u76f4\u63a5\u767b\u5f55 ----------
status, body, hdr = req("POST", "/api/new", {"password": PASSWORD})
bin_id = json.loads(body)["bin_id"]
cookie = hdr.get("Set-Cookie", "").split(";")[0]
name, value = cookie.split("=", 1)
c.cdp("Network.setCookie", {"name": name, "value": value, "domain": "127.0.0.1", "path": "/"})
c.goto(BASE + "/view/" + bin_id)
c.wait_for("document.querySelector('#hook-url') !== null", timeout=20)
expect("console loaded with a session", c.js("document.querySelector('#hook-url')") is not None)
print("bin:", bin_id)

# ---------- 3. \u6ce8\u9500\u6309\u94ae\u4f4d\u7f6e\u4e0e\u63d0\u793a ----------
expect("destroy button rendered", c.js("!!document.querySelector('[onclick=\"destroyEndpoint()\"]')"))
nav_order = c.js("Array.from(document.querySelectorAll('.nav-right .btn-apple-secondary, .nav-right .btn-apple-action'))"
                 ".map(function(b){return b.innerText.trim()}).join(' | ')")
expect("destroy sits first in the nav", nav_order.startswith("注销端点"), nav_order)
expect("destroy button is danger styled", c.js("!!document.querySelector('.nav-right .btn-apple-danger')"))

# ---------- 4. 转发弹窗：自定义下拉 ----------
c.js("openModal()")
c.wait_for("document.getElementById('f-modal').classList.contains('show')")
expect("picker defaults to wecom", c.js("document.getElementById('f-type').value") == "wecom")
expect("trigger shows the current choice", "企业微信" in (c.js("document.getElementById('f-picker-label').innerText") or ""),
       c.js("document.getElementById('f-picker-label').innerText"))

c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
expect("clicking the trigger opens the panel", c.js("!!document.getElementById('f-picker-panel')"))
expect("panel lists all 11 options", c.js("document.querySelectorAll('.picker-option').length") == 11,
       "options=%s" % c.js("document.querySelectorAll('.picker-option').length"))
expect("panel keeps the 3 groups", c.js("document.querySelectorAll('.picker-group').length") == 3,
       "groups=%s" % c.js("document.querySelectorAll('.picker-group').length"))
expect("exactly one option is selected", c.js("document.querySelectorAll('.picker-option.is-selected').length") == 1)
expect("selected option carries a tick", c.js("!!document.querySelector('.picker-option.is-selected .picker-check')"))
expect("panel is a real listbox", c.js("document.getElementById('f-picker-panel').getAttribute('role')") == "listbox")
expect("options expose aria-selected", c.js("document.querySelectorAll('.picker-option[aria-selected]').length") == 11)
expect("panel is portalled out of the modal",
       c.js("document.getElementById('f-picker-panel').parentElement === document.body"))
expect("panel is not clipped by the sheet",
       c.js("(function(){var r=document.getElementById('f-picker-panel').getBoundingClientRect();"
            "return r.top>=0&&r.left>=0&&r.right<=window.innerWidth+1&&r.bottom<=window.innerHeight+1;})()"))
expect("panel adds no drop shadow",
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).boxShadow") == "none",
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).boxShadow"))
expect("panel separates via backdrop blur",
       "blur" in (c.js("getComputedStyle(document.getElementById('f-picker-panel')).backdropFilter") or ""),
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).backdropFilter"))
expect("panel uses a hairline border",
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).borderTopWidth") == "1px")
expect("panel radius is on the radius scale",
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).borderTopLeftRadius") == "12px",
       c.js("getComputedStyle(document.getElementById('f-picker-panel')).borderTopLeftRadius"))
expect("trigger matches the sibling inputs",
       c.js("getComputedStyle(document.getElementById('f-picker-trigger')).fontSize") ==
       c.js("getComputedStyle(document.getElementById('f-url')).fontSize") and
       c.js("getComputedStyle(document.getElementById('f-picker-trigger')).borderRadius") ==
       c.js("getComputedStyle(document.getElementById('f-url')).borderRadius"))
expect("chevron flips while open",
       "matrix" in (c.js("getComputedStyle(document.querySelector('.picker-chevron')).transform") or ""))
expect("no native select remains on the page", c.js("document.querySelectorAll('select').length") == 0)
p, s = c.shot("forwarder_picker.png")
print("forwarder_picker.png %s bytes" % s)

c.js("document.querySelector('.picker-option[data-value=\"telegram\"]').click()")
expect("clicking an option closes the panel", c.js("document.getElementById('f-picker-panel')") is None)
expect("hidden field takes the new value", c.js("document.getElementById('f-type').value") == "telegram")
expect("trigger label follows", "Telegram" in (c.js("document.getElementById('f-picker-label').innerText") or ""))
expect("telegram hint mentions BotFather", "BotFather" in (c.js("document.getElementById('f-hint').innerText") or ""))
expect("telegram placeholder updates", "api.telegram.org" in (c.js("document.getElementById('f-url').placeholder") or ""))

c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
cursor0 = c.js("Array.prototype.findIndex.call(document.querySelectorAll('.picker-option'),"
               "function(r){return r.classList.contains('is-active')})")
expect("cursor starts on the selected option", cursor0 == 3, "cursor=%s" % cursor0)
c.js("document.getElementById('f-picker-trigger').dispatchEvent("
     "new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))")
cursor1 = c.js("Array.prototype.findIndex.call(document.querySelectorAll('.picker-option'),"
               "function(r){return r.classList.contains('is-active')})")
expect("ArrowDown moves the cursor", cursor1 == 4, "cursor=%s" % cursor1)
c.js("document.getElementById('f-picker-trigger').dispatchEvent("
     "new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))")
expect("Enter commits the highlighted option", c.js("document.getElementById('f-type').value") == "discord",
       c.js("document.getElementById('f-type').value"))
expect("discord placeholder updates", "discord.com" in (c.js("document.getElementById('f-url').placeholder") or ""))

c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
c.js("document.getElementById('f-picker-trigger').dispatchEvent("
     "new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
expect("Escape closes without choosing",
       c.js("document.getElementById('f-picker-panel')") is None and
       c.js("document.getElementById('f-type').value") == "discord")

c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
c.js("document.getElementById('f-url').value='https://example.com/typed'")
c.js("document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))")
expect("clicking outside closes the panel", c.js("document.getElementById('f-picker-panel')") is None)
c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
c.js("document.querySelector('.picker-option[data-value=\"ntfy\"]').click()")
expect("switching platform clears a stale url", c.js("document.getElementById('f-url').value") == "")
p, s = c.shot("forwarder_modal.png")
print("forwarder_modal.png %s bytes" % s)
c.js("closeModal()")
expect("closing the modal tears the panel down", c.js("document.getElementById('f-picker-panel')") is None)

# 矮窗口下不能把面板顶出视口（应自动限高并向上翻转）
c.js("openModal()")
c.cdp("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 560, "deviceScaleFactor": 1, "mobile": False})
c.wait_for("window.innerHeight < 600", timeout=10)
c.js("document.getElementById('f-picker-trigger').click()")
c.wait_for("document.getElementById('f-picker-panel') !== null", timeout=10)
fits = c.js("(function(){var r=document.getElementById('f-picker-panel').getBoundingClientRect();"
            "return r.top>=0&&r.bottom<=window.innerHeight+1;})()")
expect("panel stays inside a short viewport", fits,
       c.js("JSON.stringify(document.getElementById('f-picker-panel').getBoundingClientRect())"))
expect("panel is scrollable when capped",
       c.js("document.getElementById('f-picker-panel').scrollHeight > "
            "document.getElementById('f-picker-panel').clientHeight"))
c.js("document.getElementById('f-picker-trigger').dispatchEvent("
     "new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
c.cdp("Emulation.clearDeviceMetricsOverride")
c.js("closeModal()")

# ---------- 5. \u6ce8\u9500\u7aef\u70b9\uff1a\u4e8c\u6b21\u786e\u8ba4 -> \u56de\u9996\u9875 -> \u5f7d\u70b9\u5f7b\u5e95\u6d88\u5931 ----------
req("POST", "/hook/" + bin_id + "?token=" + PASSWORD, {"before": "destroy"})
expect("the endpoint received a message first", req("POST", "/hook/" + bin_id + "?token=" + PASSWORD, {"x": 1})[0] == 200)
c.js("window.confirm = function(){ return true; };")
c.cdp("Page.enable")
c.js("destroyEndpoint()")
c.wait_for("location.pathname === '/'", timeout=25)
expect("destroy lands back on the home page", c.js("location.pathname") == "/", c.js("location.pathname"))
expect("the destroyed console is gone", req("GET", "/view/" + bin_id)[0] == 404, "%s" % req("GET", "/view/" + bin_id)[0])
expect("the destroyed push endpoint is gone", req("POST", "/hook/" + bin_id + "?token=" + PASSWORD, {"x": 1})[0] == 404)
expect("re-creating still works after a destroy", req("POST", "/api/new", {"password": PASSWORD})[0] == 200)

# ---------- 6. 首页：已有端点入口 ----------
# 单独建一条端点，不沾碰上面已注销的那条
st, body, hdr = req("POST", "/api/new", {"password": PASSWORD})
find_id = json.loads(body)["bin_id"]
print("finder target:", find_id)

# 模拟只拿到 ID / 推送地址的普通访客：清掉登录态
c.cdp("Network.clearBrowserCookies")
c.js("try{sessionStorage.clear()}catch(e){}")
c.goto(BASE + "/")
c.wait_for("document.readyState === 'complete'")

expect("home renders the existing-endpoint entry", c.js("!!document.querySelector('.nav-ghost')"),
       c.js("document.querySelector('.nav-ghost') && document.querySelector('.nav-ghost').innerText"))
expect("entry sits beside the create cta",
       c.js("(function(){var a=document.querySelector('.nav-actions');"
            "return !!a && a.children.length === 2 && a.children[0].classList.contains('nav-ghost');})()"))
find_vp = c.js("window.innerHeight")
c.js("openFind()")
c.wait_for("document.getElementById('find-modal').classList.contains('show')")
expect("clicking the entry opens the finder", c.js("document.getElementById('find-modal').classList.contains('show')"))
expect("finder overlays instead of reflowing the home page",
       c.js("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)") <= find_vp + 4)
c.wait_for("document.activeElement && document.activeElement.id === 'find-id'", timeout=10)
expect("finder focuses the id field", c.js("document.activeElement && document.activeElement.id") == "find-id")
p_sh, s_sh = c.shot("home_find_modal.png")
print("home_find_modal.png %s bytes" % s_sh)

# 空输入
c.js("document.getElementById('find-submit').click()")
c.wait_for("document.getElementById('find-err').classList.contains('show')")
expect("empty input is refused", u"\u8bf7\u8f93\u5165\u7aef\u70b9" in (c.js("document.getElementById('find-err').innerText") or ""),
       repr(c.js("document.getElementById('find-err').innerText")))
expect("empty input stays on the home page", c.js("location.pathname") == "/")

# 不存在的 ID
c.js("document.getElementById('find-id').value='deadbeef'")
c.js("document.getElementById('find-submit').click()")
c.wait_for("(document.getElementById('find-err').innerText||'').indexOf('\u6ca1\u6709\u6b64\u7aef\u70b9') >= 0", timeout=15)
expect("unknown id answers with not-found",
       u"\u6ca1\u6709\u6b64\u7aef\u70b9" in (c.js("document.getElementById('find-err').innerText") or ""),
       repr(c.js("document.getElementById('find-err').innerText")))
expect("unknown id keeps the finder open", c.js("document.getElementById('find-modal').classList.contains('show')"))
expect("unknown id leaves the page alone", c.js("location.pathname") == "/")
expect("finder restores its button after a miss",
       (c.js("document.getElementById('find-submit').innerText") or "").strip() == u"\u6253\u5f00\u63a7\u5236\u53f0",
       repr(c.js("document.getElementById('find-submit').innerText")))
expect("finder button is clickable again", c.js("!document.getElementById('find-submit').disabled"))

# 直接粘整条推送地址
expect("bare id parses", c.js("parseEndpointInput('  %s  ')" % find_id) == find_id)
expect("push url parses", c.js("parseEndpointInput('https://x.example/hook/%s?token=secret')" % find_id) == find_id)
expect("console url parses", c.js("parseEndpointInput('%s/view/%s')" % (BASE, find_id)) == find_id)
expect("junk is rejected", c.js("parseEndpointInput('not a url!!')") == "")
c.js("document.getElementById('find-id').value='https://x.example/hook/%s?token=secret'" % find_id)
c.js("document.getElementById('find-submit').click()")
c.wait_for("location.pathname === '/view/%s'" % find_id, timeout=25)
expect("a pasted push url jumps to its console", c.js("location.pathname") == "/view/" + find_id,
       c.js("location.pathname"))
expect("the visitor is asked for the password", c.js("!!document.querySelector('input[name=\"password\"]')"))
expect("the locked console names the endpoint", find_id in (c.js("document.body.innerText") or ""))

# 关闭方式：Esc 与点击遮罩
c.goto(BASE + "/")
c.js("openFind()")
c.wait_for("document.getElementById('find-modal').classList.contains('show')")
c.js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
expect("escape closes the finder", not c.js("document.getElementById('find-modal').classList.contains('show')"))
expect("escape also clears the error line", not c.js("document.getElementById('find-err').classList.contains('show')"))
c.js("openFind()")
c.wait_for("document.getElementById('find-modal').classList.contains('show')")
c.js("document.getElementById('find-modal').click()")
expect("backdrop click closes the finder", not c.js("document.getElementById('find-modal').classList.contains('show')"))
expect("reopening the finder still works", c.js("(function(){openFind();"
       "var ok=document.getElementById('find-modal').classList.contains('show');closeFind();return ok;})()"))

# ---------- 7. 转发规则上限：免费版每次调用只有 50 个子请求 ----------
st, body, hdr = req("POST", "/api/new", {"password": PASSWORD})
cap_id = json.loads(body)["bin_id"]
cookie = hdr.get("Set-Cookie", "").split(";")[0]
cname, cvalue = cookie.split("=", 1)
c.cdp("Network.setCookie", {"name": cname, "value": cvalue, "domain": "127.0.0.1", "path": "/"})
c.goto(BASE + "/view/" + cap_id)
c.wait_for("document.querySelector('#hook-url') !== null", timeout=20)
print("cap endpoint:", cap_id)

c.js("openModal()")
c.wait_for("document.getElementById('f-modal').classList.contains('show')")
quota0 = (c.js("document.getElementById('f-quota').innerText") or "").strip()
expect("forwarder quota starts at zero", quota0 == "0 / 10", quota0)
expect("the quota note explains the ceiling",
       "10" in (c.js("document.getElementById('f-cap').innerText") or ""),
       c.js("document.getElementById('f-cap').innerText"))
expect("save is enabled while there is room", c.js("!document.getElementById('f-save').disabled"))

c.js("(async function(){for(var i=0;i<9;i++){await fetch('/api/'+BIN_ID+'/forwarders',"
     "{method:'POST',headers:{'Content-Type':'application/json'},"
     "body:JSON.stringify({name:'rule '+i,target_url:'https://example.com/r'+i,forward_type:'raw'})});}return 1;})()")
c.js("loadForwarders()")
expect("quota tracks the stored rules",
       (c.js("document.getElementById('f-quota').innerText") or "").strip() == "9 / 10",
       c.js("document.getElementById('f-quota').innerText"))
expect("save is still enabled one below the cap", c.js("!document.getElementById('f-save').disabled"))

c.js("document.getElementById('f-name').value='\u6700\u540e\u4e00\u6761'")
c.js("document.getElementById('f-url').value='https://example.com/tenth'")
c.js("document.getElementById('f-save').click()")
c.wait_for("document.getElementById('f-quota').innerText.trim() === '10 / 10'", timeout=15)
expect("a rule saved from the UI lands", 
       (c.js("document.getElementById('f-quota').innerText") or "").strip() == "10 / 10",
       c.js("document.getElementById('f-quota').innerText"))
expect("save is disabled at the cap", c.js("document.getElementById('f-save').disabled"))
expect("the note switches to the limit message",
       "\u4e0a\u9650" in (c.js("document.getElementById('f-cap').innerText") or ""),
       c.js("document.getElementById('f-cap').innerText"))
p_sh, s_sh = c.shot("forwarder_cap.png")
print("forwarder_cap.png %s bytes" % s_sh)

over = c.js("(async function(){var r=await fetch('/api/'+BIN_ID+'/forwarders',{method:'POST',"
            "headers:{'Content-Type':'application/json'},"
            "body:JSON.stringify({name:'over',target_url:'https://example.com/over',forward_type:'raw'})});"
            "var d=await r.json();return r.status + ':' + (d.error||'');})()")
expect("the API refuses an 11th rule", over == "400:forwarder limit reached", over)
kept = c.js("(async function(){var r=await fetch('/api/'+BIN_ID+'/forwarders');var d=await r.json();"
            "return d.forwarders.length;})()")
expect("the refused rule is not stored", kept == 10, "count=%s" % kept)

c.js("window.confirm = function(){ return true; };")
first_id = c.js("(async function(){var r=await fetch('/api/'+BIN_ID+'/forwarders');var d=await r.json();"
                "return d.forwarders[0].id;})()")
c.js("deleteForwarder(%s)" % first_id)
expect("deleting a rule frees the slot again", c.js("!document.getElementById('f-save').disabled"))
expect("quota drops back after a delete",
       (c.js("document.getElementById('f-quota').innerText") or "").strip() == "9 / 10",
       c.js("document.getElementById('f-quota').innerText"))
expect("the note returns to the normal copy",
       "\u4e0a\u9650" not in (c.js("document.getElementById('f-cap').innerText") or ""),
       c.js("document.getElementById('f-cap').innerText"))
c.js("closeModal()")

# 清收：这个端点连同它的规则一起注销，避免留在本地库里
req("POST", "/api/" + cap_id + "/destroy", headers={"Cookie": cookie})
expect("the cap endpoint is cleaned up", req("GET", "/view/" + cap_id)[0] == 404)

# ---------- 8. 载荷大小按 UTF-8 字节显示（与入库上限同口径） ----------
st, body, hdr = req("POST", "/api/new", {"password": PASSWORD})
size_id = json.loads(body)["bin_id"]
size_cookie = hdr.get("Set-Cookie", "").split(";")[0]
payload = '{"msg":"\u4e2d\u6587\u62a5\u6587\u6d4b\u8bd5\uff0c\u5b57\u8282\u6570\u4e0d\u7b49\u4e8e\u5b57\u7b26\u6570"}'
req("POST", "/hook/" + size_id + "?token=" + PASSWORD, payload)
n_bytes = len(payload.encode("utf-8"))
n_chars = len(payload)
expect("the byte count and the char count really differ", n_bytes != n_chars,
       "bytes=%s chars=%s" % (n_bytes, n_chars))

n2, v2 = size_cookie.split("=", 1)
c.cdp("Network.setCookie", {"name": n2, "value": v2, "domain": "127.0.0.1", "path": "/"})
c.goto(BASE + "/view/" + size_id)
c.wait_for("document.querySelector('#hook-url') !== null", timeout=20)
c.js("loadData()")
c.wait_for("messages.length > 0", timeout=15)
c.js("selectMsg(messages[0].id)")
meta_text = c.js("document.getElementById('d-meta').innerText") or ""
expect("payload size is reported in UTF-8 bytes",
       ("%d \u5b57\u8282" % n_bytes) in meta_text, repr(meta_text))
expect("payload size is not the raw character count",
       ("%d \u5b57\u8282" % n_chars) not in meta_text, repr(meta_text))
req("POST", "/api/" + size_id + "/destroy", headers={"Cookie": size_cookie})

c.close()

failed = [r for r in checks if not r[1]]
for nm, ok, detail in checks:
    line = ("PASS  " if ok else "FAIL  ") + nm
    if detail and not ok:
        line += "  [" + str(detail) + "]"
    print(line)
print("")
print(("ALL FEATURE CHECKS PASSED (%d)" % len(checks)) if not failed else ("%d FEATURE CHECK(S) FAILED" % len(failed)))
sys.exit(0 if not failed else 1)
