# -*- coding: utf-8 -*-
"""Browser-level QA for the create-endpoint gate and the locked console."""
import json
import sys
import urllib.request

sys.path.insert(0, r"D:\cf-webhook-bin")
from cdp import Chrome

BASE = "http://127.0.0.1:8787"
PASSWORD = "Inspector-Pass-2026"
checks = []


def expect(name, cond, detail=""):
    checks.append((name, bool(cond), detail))


def post(path, payload, headers=None):
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode("utf-8"), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, r.read().decode("utf-8", "replace")


c = Chrome(port=9334, width=1440, height=900)

# ---------- 1. home still fits one screen ----------
c.goto(BASE + "/")
c.wait_for("document.readyState === 'complete'")
viewport = c.js("window.innerHeight")
doc_h = c.js("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
expect("home fits the first screen", doc_h <= viewport + 4, "doc=%s viewport=%s" % (doc_h, viewport))
expect("modal is hidden on load", c.js("getComputedStyle(document.getElementById('create-modal')).display") == "none",
       c.js("getComputedStyle(document.getElementById('create-modal')).display"))
path, size = c.shot("home_fold.png")
print("home_fold.png  %s bytes  (doc=%s viewport=%s)" % (size, doc_h, viewport))

# ---------- 2. the nav CTA opens the gate ----------
c.js("document.querySelector('.nav-cta').click()")
c.wait_for("document.getElementById('create-modal').classList.contains('show')")
expect("nav CTA opens the modal", c.js("document.getElementById('create-modal').classList.contains('show')"))
expect("modal becomes visible", c.js("getComputedStyle(document.getElementById('create-modal')).display") == "flex",
       c.js("getComputedStyle(document.getElementById('create-modal')).display"))
expect("disclaimer heading rendered", "免责声明" in (c.js("document.getElementById('create-modal').innerText") or ""))
modal_text = c.js("document.getElementById('create-modal').innerText") or ""
expect("warning reminds about the password", "请务必保护好你的密码与推送令牌" in modal_text)
expect("warning covers endpoint leakage", "泄露" in modal_text or "泄漏" in modal_text)
expect("warning shows the query token form", "?token=" in modal_text)
expect("warning shows the header token form", "X-Webhook-Token" in modal_text)
c.wait_for("document.activeElement && document.activeElement.id === 'pwd'", timeout=5)
expect("password field is focused", c.js("document.activeElement && document.activeElement.id") == "pwd",
       c.js("document.activeElement && document.activeElement.id"))
modal_fits = c.js("var m=document.querySelector('#create-modal .modal-sheet')||document.querySelector('#create-modal .sheet'); m ? m.getBoundingClientRect().bottom <= window.innerHeight + 1 : null")
expect("modal sheet fits the viewport", modal_fits in (True, None), "fits=%s" % modal_fits)
path, size = c.shot("create_modal.png")
print("create_modal.png  %s bytes  (sheet_fits=%s)" % (size, modal_fits))

# ---------- 3. client-side validation ----------
def try_submit(pwd, pwd2, agree):
    c.js("document.getElementById('pwd').value=%s;document.getElementById('pwd2').value=%s;document.getElementById('agree').checked=%s;"
         "document.querySelector('#create-form button[type=submit]').click()"
         % (json.dumps(pwd), json.dumps(pwd2), "true" if agree else "false"))
    # a successful submit navigates away and takes the gate with it
    return c.js("(function(){var el=document.getElementById('modal-err');return el?el.textContent:'';})()") or "" 

err = try_submit("short", "short", True)
expect("short password is refused", "8" in err, err[:40])
expect("still on home after a short password", c.js("location.pathname") == "/")
path, size = c.shot("create_modal_error.png")

err = try_submit(PASSWORD, "Mismatch-Pass-2026", True)
expect("mismatched confirmation is refused", "不一致" in err, err[:40])

err = try_submit(PASSWORD, PASSWORD, False)
expect("unchecked disclaimer is refused", "免责声明" in err, err[:40])

# ---------- 4. an accepted submission lands in the unlocked console ----------
try_submit(PASSWORD, PASSWORD, True)
c.wait_for("location.pathname.indexOf('/view/') === 0")
bin_id = (c.js("location.pathname") or "").split("/")[-1]
expect("valid submission creates and opens an endpoint", bool(bin_id) and len(bin_id) == 8, "bin=%s" % bin_id)
expect("console renders for the owner", c.js("document.getElementById('hook-url')") is not None)
expect("the create gate is gone after success", c.js("document.getElementById('create-modal')") is None)
expect("token handed over via sessionStorage", c.js("sessionStorage.getItem('wh_token_' + BIN_ID)") == PASSWORD)
expect("pending password is cleared", c.js("sessionStorage.getItem('wh_pending_pwd')") is None)

print("bin_id:", bin_id)

# ---------- 5. the console can push to itself, but does not print the secret ----------
hook_txt = c.js("document.getElementById('hook-url').innerText") or ""
expect("printed push url has no token", "?token=" not in hook_txt, hook_txt[:70])
expect("token footnote is rendered", "令牌" in (c.js("document.getElementById('token-note').innerText") or ""))
curl_txt = c.js("document.getElementById('curl-cmd').innerText") or ""
expect("sample curl carries the token", ("?token=" + PASSWORD) in curl_txt, curl_txt[:110])

status, body = post("/hook/" + bin_id + "?token=" + PASSWORD, {"kind": "problem", "host": "web-01", "ok": False})
expect("python push with the token is accepted", status == 200, body[:80])
status, body = post("/hook/" + bin_id, {"kind": "recovery", "host": "web-01", "ok": True}, {"X-Webhook-Token": PASSWORD})
expect("python push via header is accepted", status == 200, body[:80])
try:
    post("/hook/" + bin_id, {"kind": "spoof"})
    expect("python push without a token is rejected", False, "accepted")
except urllib.error.HTTPError as e:
    expect("python push without a token is rejected", e.code == 401, "status=%s" % e.code)

# ---------- 6. both payloads show up verbatim ----------
c.js("loadData()")
ok = c.wait_for("document.querySelectorAll('.msg-row').length >= 2", timeout=25)
expect("both pushes appear in the queue", ok, "rows=%s" % c.js("document.querySelectorAll('.msg-row').length"))
c.js("document.querySelector('.msg-row').click()")
c.wait_for("document.getElementById('detail-box').style.display !== 'none'")
raw = c.js("document.getElementById('d-raw').textContent") or ""
expect("newest payload is shown verbatim", "recovery" in raw, raw[:90])
c.js("document.querySelectorAll('.msg-row')[1].click()")
expect("older payload is shown verbatim", "problem" in (c.js("document.getElementById('d-raw').textContent") or ""))
path, size = c.shot("console_unlocked.png", full=True)
print("console_unlocked.png  %s bytes" % size)

# ---------- 7. a fresh browser is locked out, and can get back in ----------
c.cdp("Network.clearBrowserCookies")
c.goto(BASE + "/view/" + bin_id)
expect("a fresh visitor is locked out", c.js("document.querySelector('#hook-url')") is None)
expect("a fresh visitor gets a password form", c.js("!!document.querySelector('input[name=password]')"))
expect("the locked page never leaks the password", PASSWORD not in (c.js("document.documentElement.innerText") or ""))
path, size = c.shot("console_locked.png")
print("console_locked.png  %s bytes" % size)

c.js("document.getElementById('p').value='wrong-password';document.querySelector('form').submit()")
c.wait_for("document.body.innerText.indexOf('密码不正确') > -1", timeout=20)
expect("a wrong password is rejected", "密码不正确" in (c.js("document.body.innerText") or ""))
expect("still locked after a wrong password", c.js("document.querySelector('#hook-url')") is None)

c.js("document.getElementById('p').value=%s;document.querySelector('form').submit()" % json.dumps(PASSWORD))
c.wait_for("document.querySelector('#hook-url') !== null", timeout=25)
expect("the right password unlocks the console", c.js("document.querySelector('#hook-url')") is not None)
expect("unlocked session caches the token again", c.js("sessionStorage.getItem('wh_token_' + BIN_ID)") == PASSWORD)
c.wait_for("document.querySelectorAll('.msg-row').length >= 2", timeout=25)
expect("queue is still there after re-login", c.js("document.querySelectorAll('.msg-row').length") >= 2,
       "rows=%s" % c.js("document.querySelectorAll('.msg-row').length"))

# ---------- 8. locking the console back up ----------
c.cdp("Page.setBypassCSP", {"enabled": True})
c.js("window.confirm = function(){ return true; }; logoutConsole();")
c.wait_for("document.querySelector('input[name=password]') !== null", timeout=25)
expect("locking drops back to the password form", c.js("!!document.querySelector('input[name=password]')"))
expect("locking forgets the cached token", c.js("sessionStorage.getItem('wh_token_%s')" % bin_id) is None)

c.close()

failed = [r for r in checks if not r[1]]
for name, ok, detail in checks:
    line = ("PASS  " if ok else "FAIL  ") + name
    if detail and not ok:
        line += "  [" + str(detail) + "]"
    print(line)
print("")
print("endpoint: %s   password: %s" % (bin_id, PASSWORD))
print(("ALL BROWSER CHECKS PASSED (%d)" % len(checks)) if not failed else ("%d BROWSER CHECK(S) FAILED" % len(failed)))
sys.exit(0 if not failed else 1)
