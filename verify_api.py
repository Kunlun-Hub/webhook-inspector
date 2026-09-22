# -*- coding: utf-8 -*-
"""End-to-end API verification against a running dev server.

Usage:
  npx wrangler dev --port 8787     # in one shell
  python verify_api.py             # in another
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8787"
PASSWORD = "Verify-Pass-2026"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def request(method, url, data=None, headers=None, allow_redirect=False):
    body = None
    if data is not None:
        if isinstance(data, bytes):
            body = data
        elif isinstance(data, str):
            body = data.encode("utf-8")
        else:
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method)
    if isinstance(data, dict):
        req.add_header("Content-Type", "application/json; charset=utf-8")
    elif isinstance(data, str):
        req.add_header("Content-Type", "application/x-www-form-urlencoded; charset=utf-8")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    opener = urllib.request.build_opener() if allow_redirect else urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=25) as r:
            return r.status, r.headers.get("Location"), r.read().decode("utf-8", "replace"), r.headers.get("Set-Cookie")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location"), e.read().decode("utf-8", "replace"), e.headers.get("Set-Cookie")


def cookie_of(set_cookie):
    return (set_cookie or "").split(";")[0]


# --- connectivity ---
try:
    status, _, body, _ = request("GET", BASE + "/")
except Exception as exc:
    print("Cannot reach %s - start the dev server first. (%s)" % (BASE, exc))
    sys.exit(2)
check("GET / serves landing page", status == 200 and "Webhook Inspector" in body)
check("landing page gates creation behind the disclaimer modal", "create-modal" in body and "\u514d\u8d23\u58f0\u660e" in body)

# --- creation is password gated ---
status, _, _, _ = request("POST", BASE + "/api/new", {"password": "short"})
check("POST /api/new rejects a password under 8 chars", status == 400, "status=%s" % status)

status, _, created, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
check("POST /api/new creates an endpoint with JSON in", status == 200, "status=%s" % status)
bin_id = (json.loads(created).get("bin_id") if status == 200 else "")
check("creation returns the bin id", bool(bin_id), created[:120])
if not bin_id:
    print("cannot continue without an endpoint")
    sys.exit(2)

# --- the console is locked without a session ---
status, _, page, _ = request("GET", BASE + "/view/" + bin_id)
check("GET /view/<id> without a session returns 401", status == 401, "status=%s" % status)
check("locked console renders the password form", 'name="password"' in page and bin_id in page)

status, _, _, _ = request("GET", BASE + "/api/" + bin_id + "/events")
check("events API without a session returns 401", status == 401, "status=%s" % status)
status, _, _, _ = request("GET", BASE + "/api/" + bin_id + "/forwarders")
check("forwarders API without a session returns 401", status == 401, "status=%s" % status)

# --- the push token equals the console password ---
status, _, _, _ = request("POST", BASE + "/hook/" + bin_id, {"a": 1})
check("POST /hook/<id> without a token returns 401", status == 401, "status=%s" % status)
status, _, _, _ = request("POST", BASE + "/hook/" + bin_id + "?token=wrong-token", {"a": 1})
check("POST /hook/<id> with a wrong token returns 401", status == 401, "status=%s" % status)

raw = ('{"event":"\u544a\u8b66","note":"line1\\nline2 \\"quoted\\"","nested":{"z":1,"a":[1,2,3]},"spaces":"  keep  me  "}')
status, _, hook_body, _ = request(
    "POST",
    BASE + "/hook/" + bin_id + "?token=" + urllib.parse.quote(PASSWORD) + "&tag=hello",
    data=raw.encode("utf-8"),
    headers={"Content-Type": "application/json", "X-Verify-Token": "abc-123", "User-Agent": "Verify/1.0"},
)
check("POST /hook/<id>?token=<password> is accepted", status == 200, hook_body[:120])

status, _, hook_body, _ = request(
    "POST", BASE + "/hook/" + bin_id, {"b": 2},
    headers={"X-Webhook-Token": PASSWORD, "User-Agent": "Verify/2.0"},
)
check("POST /hook/<id> with X-Webhook-Token is accepted", status == 200, hook_body[:120])

status, _, _, _ = request("POST", BASE + "/hook/does-not-exist-xyz", {"a": 1}, headers={"X-Webhook-Token": "x"})
check("unknown endpoint returns 404", status == 404, "status=%s" % status)

# --- logging in ---
status, _, _, _ = request("POST", BASE + "/api/" + bin_id + "/login", "password=definitely-wrong")
check("login with a wrong password returns 401", status == 401, "status=%s" % status)

status, location, _, set_cookie = request("POST", BASE + "/api/" + bin_id + "/login", "password=" + urllib.parse.quote(PASSWORD))
check("login with the right password redirects", status == 303 and location == "/view/" + bin_id, "status=%s loc=%s" % (status, location))
session = cookie_of(set_cookie)
check("login issues a session cookie", session.startswith("wh_" + bin_id + "="), session[:40])
check("session cookie is HttpOnly", "HttpOnly" in (set_cookie or ""))
check("session cookie is SameSite", "SameSite=Lax" in (set_cookie or ""))

auth = {"Cookie": session}
status, _, page, _ = request("GET", BASE + "/view/" + bin_id, headers=auth)
check("GET /view/<id> with a session serves the console", status == 200 and bin_id in page)
check("console exposes the push target", "/hook/" + bin_id in page)
check("console narrows the token hint", "token-note" in page)

# --- capstone: verbatim capture (byte exact, including CJK + escapes + whitespace) ---
status, _, events, _ = request("GET", BASE + "/api/" + bin_id + "/events", headers=auth)
check("events API with a session returns 200", status == 200, "status=%s" % status)
messages = json.loads(events).get("messages", [])
check("event list returns both messages", len(messages) >= 2, "count=%s" % len(messages))
msg = next((m for m in messages if m.get("raw_body", "").startswith("{\"event\"")), None)
check("the verbatim payload is present", msg is not None)
if msg:
    check("raw body stored byte-for-byte", msg.get("raw_body") == raw, repr((msg.get("raw_body") or "")[:90]))
    check("method recorded", msg.get("method") == "POST")
    check("content-type preserved", "application/json" in json.loads(msg.get("headers") or "{}").get("content-type", ""))
    check("user-agent preserved", json.loads(msg.get("headers") or "{}").get("user-agent") == "Verify/1.0")
    check("custom header preserved", json.loads(msg.get("headers") or "{}").get("x-verify-token") == "abc-123")

# --- secrets never come back out ---
check("no stored record echoes the password", PASSWORD not in events)
stored_qs = " ".join((m.get("query_params") or "") for m in messages)
check("token query param is redacted", "token=***" in stored_qs and PASSWORD not in stored_qs, stored_qs[:90])
stored_headers = " ".join((m.get("headers") or "") for m in messages)
check("X-Webhook-Token header is redacted", stored_headers.count('"x-webhook-token": "***"') >= 1)
check("Authorization header is redacted", '"authorization": "***"' in stored_headers or "authorization" not in stored_headers)
check("non-secret query params survive", "tag=hello" in stored_qs, stored_qs[:90])

# --- a second endpoint keeps its own session ---
status, _, other, _ = request("POST", BASE + "/api/new", {"password": "Other-Pass-2026"})
other_id = json.loads(other).get("bin_id") if status == 200 else ""
status, _, _, _ = request("GET", BASE + "/api/" + other_id + "/events", headers=auth)
check("a session for one endpoint does not open another", status == 401, "status=%s" % status)

# --- 报文原文入库前的体积收敛（D1 单行上限 2 MB） ---
status, _, made, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
big_bin = json.loads(made)["bin_id"] if status == 200 else ""
_, _, _, big_cookie = request("POST", BASE + "/api/" + big_bin + "/login", "password=" + urllib.parse.quote(PASSWORD))
big_auth = {"Cookie": cookie_of(big_cookie)}

huge = b"a" * (3 * 1024 * 1024)
status, _, hook_body, _ = request("POST", BASE + "/hook/" + big_bin + "?token=" + urllib.parse.quote(PASSWORD), huge)
check("a 3 MB payload is still accepted", status == 200, "status=%s %s" % (status, hook_body[:110]))
hook_json = json.loads(hook_body or "{}")
check("the response flags the truncation", hook_json.get("truncated") is True, hook_body[:140])
check("the response reports the original size", hook_json.get("original_bytes") == len(huge),
      "original_bytes=%s" % hook_json.get("original_bytes"))

_, _, events, _ = request("GET", BASE + "/api/" + big_bin + "/events", headers=big_auth)
stored = (json.loads(events).get("messages") or [{}])[0].get("raw_body") or ""
check("the stored copy carries the truncation note", "[\u5df2\u622a\u65ad]" in stored)
check("the stored copy fits the ingest budget", len(stored.encode("utf-8")) <= 1024 * 1024 + 200,
      "bytes=%s" % len(stored.encode("utf-8")))
check("the stored copy keeps the original prefix", stored.startswith("a" * 4096))
check("the stored copy is not empty", len(stored) > 1024 * 1024 - 200)

cjk_text = "\u62a5\u6587" * 400000
cjk = cjk_text.encode("utf-8")
check("the CJK probe really exceeds the budget", len(cjk) > 1024 * 1024, "bytes=%s" % len(cjk))
status, _, _, _ = request("POST", BASE + "/hook/" + big_bin + "?token=" + urllib.parse.quote(PASSWORD), cjk)
_, _, events, _ = request("GET", BASE + "/api/" + big_bin + "/events", headers=big_auth)
rows = json.loads(events).get("messages") or []
cjk_stored = next((r.get("raw_body") or "" for r in rows if "[\u5df2\u622a\u65ad]" in (r.get("raw_body") or "")
                   and not (r.get("raw_body") or "").startswith("a")), "")
cjk_kept = cjk_stored.split("\n\n[\u5df2\u622a\u65ad]")[0]
kept_bytes = len(cjk_kept.encode("utf-8"))
check("the multibyte copy keeps an intact prefix", cjk_kept == cjk_text[:len(cjk_kept)],
      "kept=%s" % len(cjk_kept))
check("the cut lands on a character boundary",
      kept_bytes % 3 == 0 and "\ufffd" not in cjk_stored and not cjk_kept.endswith("\ufffd"),
      "kept_bytes=%s mod3=%s" % (kept_bytes, kept_bytes % 3))
check("the multibyte copy uses the whole budget", kept_bytes >= 1024 * 1024 - 3 and kept_bytes <= 1024 * 1024,
      "kept_bytes=%s" % kept_bytes)

small = b'{"tiny":"ok"}'
status, _, hook_body, _ = request("POST", BASE + "/hook/" + big_bin + "?token=" + urllib.parse.quote(PASSWORD), small)
check("a small payload is not flagged", json.loads(hook_body or "{}").get("truncated") is False, hook_body[:110])
_, _, events, _ = request("GET", BASE + "/api/" + big_bin + "/events", headers=big_auth)
tiny = next((r.get("raw_body") for r in (json.loads(events).get("messages") or [])
             if (r.get("raw_body") or "").startswith('{"tiny')), None)
check("a small payload stays byte-for-byte", tiny == small.decode(), repr(tiny))

# --- forwarder CRUD + UTF-8 round trip ---
name = "SRE \u6838\u5fc3\u544a\u8b66\u7fa4"
request("POST", BASE + "/api/" + bin_id + "/forwarders",
        {"name": name, "target_url": "https://example.com/hook", "forward_type": "wecom"}, headers=auth)
status, _, listing, _ = request("GET", BASE + "/api/" + bin_id + "/forwarders", headers=auth)
items = json.loads(listing).get("forwarders", [])
check("forwarder created", len(items) == 1)
check("forwarder name round-trips as UTF-8", any(i["name"] == name for i in items))
check("forwarder type stored", bool(items) and items[0]["forward_type"] == "wecom")
if items:
    request("DELETE", BASE + "/api/" + bin_id + "/forwarders/" + str(items[0]["id"]), headers=auth)
    _, _, listing, _ = request("GET", BASE + "/api/" + bin_id + "/forwarders", headers=auth)
    check("forwarder deleted", len(json.loads(listing).get("forwarders", [])) == 0)

# --- 转发规则上限：免费版每次调用只有 50 个子请求，必须封顶 ---
status, _, made, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
cap_bin = json.loads(made)["bin_id"] if status == 200 else ""
_, _, _, cap_cookie = request("POST", BASE + "/api/" + cap_bin + "/login", "password=" + urllib.parse.quote(PASSWORD))
cap_auth = {"Cookie": cookie_of(cap_cookie)}

_, _, listing, _ = request("GET", BASE + "/api/" + cap_bin + "/forwarders", headers=cap_auth)
cap = json.loads(listing).get("limit")
check("the forwarder limit is published by the API", isinstance(cap, int) and cap > 0, "limit=%s" % cap)
cap = cap if isinstance(cap, int) and cap > 0 else 10

codes = [request("POST", BASE + "/api/" + cap_bin + "/forwarders",
                 {"name": "cap %d" % i, "target_url": "https://example.com/cap%d" % i, "forward_type": "raw"},
                 headers=cap_auth)[0] for i in range(cap + 1)]
check("rules up to the limit are accepted", all(c == 200 for c in codes[:cap]), str(codes))
check("the rule past the limit is refused", codes[cap] == 400, "status=%s" % codes[cap])

_, _, listing, _ = request("GET", BASE + "/api/" + cap_bin + "/forwarders", headers=cap_auth)
kept = json.loads(listing).get("forwarders", [])
check("the refused rule was not stored", len(kept) == cap, "count=%s" % len(kept))

_, _, refused, _ = request("POST", BASE + "/api/" + cap_bin + "/forwarders",
                           {"name": "over", "target_url": "https://example.com/over", "forward_type": "raw"},
                           headers=cap_auth)
check("the refusal names the reason", json.loads(refused).get("error") == "forwarder limit reached", refused[:120])

_, _, listing, _ = request("GET", BASE + "/api/" + cap_bin + "/forwarders", headers=cap_auth)
kept = json.loads(listing).get("forwarders", [])
if kept:
    request("DELETE", BASE + "/api/" + cap_bin + "/forwarders/" + str(kept[-1]["id"]), headers=cap_auth)
status, _, _, _ = request("POST", BASE + "/api/" + cap_bin + "/forwarders",
                          {"name": "after delete", "target_url": "https://example.com/again", "forward_type": "raw"},
                          headers=cap_auth)
check("deleting one frees a slot", status == 200, "status=%s" % status)

status, _, _, _ = request("POST", BASE + "/api/" + cap_bin + "/destroy", headers=cap_auth)
check("the cap endpoint is disposable", status == 303, "status=%s" % status)


# --- clear ---
request("POST", BASE + "/api/" + bin_id + "/clear", headers=auth)
_, _, events, _ = request("GET", BASE + "/api/" + bin_id + "/events", headers=auth)
check("clear empties the queue", len(json.loads(events).get("messages", [])) == 0)

# --- locking the console back up ---
status, location, _, set_cookie = request("POST", BASE + "/api/" + bin_id + "/logout", headers=auth)
check("logout redirects back to the console", status == 303 and location == "/view/" + bin_id, "status=%s" % status)
status, _, page, _ = request("GET", BASE + "/view/" + bin_id, headers={"Cookie": cookie_of(set_cookie)})
check("the cleared cookie no longer opens the console", status == 401, "status=%s" % status)

# --- 注销端点：需要会话，且连同记录一并清理 ---
status, _, won, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
doomed = json.loads(won)["bin_id"] if status == 200 else ""
_, _, _, doomed_cookie = request("POST", BASE + "/api/" + doomed + "/login", "password=" + urllib.parse.quote(PASSWORD))
doomed_auth = {"Cookie": cookie_of(doomed_cookie)}
request("POST", BASE + "/api/" + doomed + "/forwarders",
        {"name": "Doomed", "target_url": "https://example.com/x", "forward_type": "raw"}, headers=doomed_auth)
request("POST", BASE + "/hook/" + doomed + "?token=" + urllib.parse.quote(PASSWORD), {"seed": 1})

status, _, _, _ = request("POST", BASE + "/api/" + doomed + "/destroy")
check("destroy without a session is refused", status == 401, "status=%s" % status)
status, _, _, _ = request("GET", BASE + "/hook/" + doomed + "?token=" + urllib.parse.quote(PASSWORD))
check("the endpoint survives a refused destroy", status == 200, "status=%s" % status)

status, location, _, set_cookie = request("POST", BASE + "/api/" + doomed + "/destroy", headers=doomed_auth)
check("destroy with a session redirects home", status == 303 and location == "/", "status=%s loc=%s" % (status, location))
check("destroy clears the session cookie", "Max-Age=0" in (set_cookie or ""), (set_cookie or "")[:60])

status, _, _ = request("GET", BASE + "/view/" + doomed)[:3]
check("the console is gone after destroy", status == 404, "status=%s" % status)
status, _, body = request("POST", BASE + "/hook/" + doomed + "?token=" + urllib.parse.quote(PASSWORD))[:3]
check("the push endpoint is gone after destroy", status == 404, "status=%s" % status)

status, _, body, _ = request("GET", BASE + "/api/" + doomed + "/events", headers=doomed_auth)
check("the token no longer opens the destroyed endpoint", status == 404, "status=%s" % status)

# --- 新增推送渠道：拿自己的另一个端点当接收器，验证真的装了对方的格式 ---
CHANNELS = ["telegram", "discord", "slack", "ntfy", "bark", "gotify", "serverchan"]
for idx, channel in enumerate(CHANNELS):
    status, _, sink_raw, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
    sink = json.loads(sink_raw)["bin_id"] if status == 200 else ""
    target = "%s/hook/%s?token=%s&chat_id=999" % (BASE, sink, urllib.parse.quote(PASSWORD))
    request("POST", BASE + "/api/" + bin_id + "/forwarders",
            {"name": channel, "target_url": target, "forward_type": channel}, headers=auth)
    request("POST", BASE + "/hook/" + bin_id + "?token=" + urllib.parse.quote(PASSWORD),
            {"channel_probe": channel, "seq": idx})
    _, _, _, sink_cookie = request("POST", BASE + "/api/" + sink + "/login", "password=" + urllib.parse.quote(PASSWORD))
    _, _, sink_events, _ = request("GET", BASE + "/api/" + sink + "/events",
                                   headers={"Cookie": cookie_of(sink_cookie)})
    got = json.loads(sink_events).get("messages", [])
    check("%s adapter delivers exactly one message" % channel, len(got) == 1, "count=%s" % len(got))
    if not got:
        continue
    payload = got[0].get("raw_body") or ""
    ct = json.loads(got[0].get("headers") or "{}").get("content-type", "")
    marker = "\"channel_probe\": \"%s\"" % channel
    if channel == "telegram":
        check("telegram sends chat_id + text", '"chat_id"' in payload and '"text"' in payload and "999" in payload, payload[:110])
    elif channel == "discord":
        check("discord sends the content field", '"content"' in payload and "channel_probe" in payload, payload[:110])
    elif channel == "slack":
        check("slack sends the text field", '"text"' in payload and '"content"' not in payload, payload[:110])
    elif channel == "ntfy":
        check("ntfy posts plain text, not json", channel in payload and not payload.lstrip().startswith("{"), payload[:110])
        check("ntfy sets the Title header", "incoming_envelope" in json.dumps(got[0].get("headers")), ct)
    elif channel == "bark":
        check("bark sends title/body/group", '"title"' in payload and '"group"' in payload, payload[:110])
    elif channel == "gotify":
        check("gotify sends title/message/priority", '"message"' in payload and '"priority"' in payload, payload[:110])
    elif channel == "serverchan":
        check("serverchan posts form-encoded", payload.startswith("title=") and "desp=" in payload, payload[:110])
        check("serverchan sets the form content-type", "x-www-form-urlencoded" in ct, ct)
    check("%s preserves the original payload" % channel, channel in payload, payload[:110])

# 收尾：把上面为测试添加的转发器都清掉
for item in json.loads(request("GET", BASE + "/api/" + bin_id + "/forwarders", headers=auth)[2]).get("forwarders", []):
    request("DELETE", BASE + "/api/" + bin_id + "/forwarders/" + str(item["id"]), headers=auth)

# --- 首页「已有端点」入口用的存在性查询 ---
status, _, body, _ = request("GET", BASE + "/api/exists?id=" + bin_id)
check("lookup finds a live endpoint", status == 200 and json.loads(body).get("exists") is True, body[:90])

status, _, body, _ = request("GET", BASE + "/api/exists?id=deadbeef")
check("lookup reports a missing endpoint", status == 200 and json.loads(body).get("exists") is False, body[:90])

check("lookup tolerates an empty id", json.loads(request("GET", BASE + "/api/exists?id=")[2]).get("exists") is False)
check("lookup tolerates a missing parameter", json.loads(request("GET", BASE + "/api/exists")[2]).get("exists") is False)

status, _, body, _ = request("GET", BASE + "/api/exists?id=" + urllib.parse.quote("' OR 1=1 --"))
check("lookup is injection safe", json.loads(body).get("exists") is False, body[:90])

status, _, body, _ = request("GET", BASE + "/api/exists?id=" + doomed)
check("lookup reports a destroyed endpoint as gone", json.loads(body).get("exists") is False, body[:90])

check("lookup leaks nothing but existence",
      set(json.loads(request("GET", BASE + "/api/exists?id=" + bin_id)[2]).keys()) == {"ok", "exists"},
      request("GET", BASE + "/api/exists?id=" + bin_id)[2][:90])

check("lookup needs no session", request("GET", BASE + "/api/exists?id=" + bin_id)[0] == 200)

# --- 首页统计条：累计量 + 当日额度余量 ---
import datetime as _dt
import time as _time


def stats(headers=None):
    req = urllib.request.Request(BASE + "/api/stats", method="GET")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urllib.request.build_opener(NoRedirect).open(req, timeout=25) as resp:
        return dict(resp.headers), json.loads(resp.read().decode("utf-8", "replace"))


_hdr, s0 = stats()
check("stats answers without a session", s0.get("ok") is True, str(s0)[:80])
check("stats exposes exactly the documented keys",
      set(s0.keys()) == {"ok", "day", "received", "forwarded", "usage", "limits", "updated_at", "measured"},
      str(sorted(s0.keys())))
check("stats stamps the UTC day",
      s0.get("day") == _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d"), s0.get("day"))
check("stats splits usage into requests/reads/writes",
      set(s0.get("usage", {}).keys()) == {"requests", "d1_reads", "d1_writes"}, str(s0.get("usage")))
check("stats publishes the Workers free request limit", s0["limits"].get("requests") == 100000, str(s0.get("limits")))
check("stats publishes the D1 free allowance",
      s0["limits"].get("d1_reads") == 5000000 and s0["limits"].get("d1_writes") == 100000, str(s0.get("limits")))
check("stats counters are non-negative integers",
      isinstance(s0.get("received"), int) and isinstance(s0.get("forwarded"), int)
      and all(isinstance(s0["usage"][k], int) and s0["usage"][k] >= 0 for k in ("requests", "d1_reads", "d1_writes")),
      str(s0))
check("stats is cacheable for a minute", "max-age=60" in (_hdr.get("Cache-Control") or ""), _hdr.get("Cache-Control"))
check("stats never leaks an endpoint id or password",
      bin_id not in json.dumps(s0) and PASSWORD not in json.dumps(s0), json.dumps(s0)[:90])

# 一串请求必须按「次数」记账，而不是按落库批次记账。
# 先推一条消息强制结算（收到消息就立刻落库），再读基线，
# 否则基线里还挂着上一批未结算的计数，会把增量算成不可预期的值。
request("POST", BASE + "/hook/" + bin_id + "?token=" + urllib.parse.quote(PASSWORD), {"stats_settle": 1})
_time.sleep(1.5)
_before = stats()[1]
for _ in range(6):
    request("GET", BASE + "/")
request("POST", BASE + "/hook/" + bin_id + "?token=" + urllib.parse.quote(PASSWORD), {"stats_probe": 1})
_time.sleep(1.5)
_after = stats()[1]
_delta = _after["usage"]["requests"] - _before["usage"]["requests"]
# 预期：基线那次读取 1 + 6 次首页 1...6 + 这次推送 1 = 8
check("stats counts every request, not every flush", _delta >= 8, "delta=%s" % _delta)
check("stats does not inflate the request count", _delta <= 10, "delta=%s" % _delta)
check("stats counts a received message", _after["received"] == _before["received"] + 1,
      "%s -> %s" % (_before["received"], _after["received"]))
check("stats sees the D1 writes it caused", _after["usage"]["d1_writes"] > _before["usage"]["d1_writes"],
      "%s -> %s" % (_before["usage"]["d1_writes"], _after["usage"]["d1_writes"]))

# 转发：只有真送到的才计数，404 的目标不能算
status, _, sink_raw, _ = request("POST", BASE + "/api/new", {"password": PASSWORD})
stats_sink = json.loads(sink_raw)["bin_id"] if status == 200 else ""
request("POST", BASE + "/api/" + bin_id + "/forwarders",
        {"name": "stats-ok", "forward_type": "raw",
         "target_url": "%s/hook/%s?token=%s" % (BASE, stats_sink, urllib.parse.quote(PASSWORD))}, headers=auth)
request("POST", BASE + "/api/" + bin_id + "/forwarders",
        {"name": "stats-gone", "forward_type": "raw",
         "target_url": "%s/hook/deadbeef?token=x" % BASE}, headers=auth)

_f0 = stats()[1]["forwarded"]
request("POST", BASE + "/hook/" + bin_id + "?token=" + urllib.parse.quote(PASSWORD), {"stats_probe": "forward"})
_f1 = _f0
for _ in range(25):
    _time.sleep(0.6)
    _f1 = stats()[1]["forwarded"]
    if _f1 != _f0:
        break
check("stats counts only successful deliveries", _f1 == _f0 + 1, "%s -> %s" % (_f0, _f1))

for item in json.loads(request("GET", BASE + "/api/" + bin_id + "/forwarders", headers=auth)[2]).get("forwarders", []):
    request("DELETE", BASE + "/api/" + bin_id + "/forwarders/" + str(item["id"]), headers=auth)
request("POST", BASE + "/api/" + stats_sink + "/destroy", headers={"Cookie": cookie_of(request("POST", BASE + "/api/" + stats_sink + "/login", "password=" + urllib.parse.quote(PASSWORD))[3])})
check("the stats sink is cleaned up", request("GET", BASE + "/view/" + stats_sink)[0] == 404)

failed = [r for r in results if not r[1]]
for name_, ok, detail in results:
    line = ("PASS  " if ok else "FAIL  ") + name_
    if detail and not ok:
        line += "  [" + str(detail) + "]"
    print(line)
print("")
print("endpoint: %s   password: %s" % (bin_id, PASSWORD))
print(("ALL API CHECKS PASSED (%d)" % len(results)) if not failed else ("%d CHECK(S) FAILED" % len(failed)))
sys.exit(0 if not failed else 1)
