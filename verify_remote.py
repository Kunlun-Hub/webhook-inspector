# -*- coding: utf-8 -*-
"""生产环境冒烟测试：对已部署的 Worker 跑一遍真实链路。

用法：
  python verify_remote.py                                  # 用默认线上地址
  python verify_remote.py https://your-worker.workers.dev   # 指定地址

注意：需要能访问 workers.dev，如在代理后用，先设置 HTTPS_PROXY。
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://webhook-inspector.kfc4008208820.workers.dev").rstrip("/")
PASSWORD = "Remote-Smoke-2026"
# Cloudflare 会按浏览器签名拦截已知爬虫 UA（Python-urllib 直接吃 403 error 1010），
# 这里用 Zabbix 的 UA，顺便验证真机推送的签名能过。
USER_AGENT = "Zabbix/6.4.0"
checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def call(method, path, data=None, headers=None, timeout=40):
    body = None
    h = {"User-Agent": USER_AGENT}
    if isinstance(data, bytes):
        body = data
    elif isinstance(data, str):
        body = data.encode("utf-8")
        h["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"
    elif data is not None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        h["Content-Type"] = "application/json; charset=utf-8"
    h.update(headers or {})
    req = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    try:
        with OPENER.open(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace"), r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), e.headers


print("target:", BASE)
try:
    st, home, hdr = call("GET", "/")
except Exception as exc:
    print("cannot reach %s (%s)" % (BASE, exc))
    sys.exit(2)

check("home returns 200", st == 200, "status=%s" % st)
check("home is served as html", "text/html" in (hdr.get("Content-Type") or ""), hdr.get("Content-Type"))
check("home carries the new endpoint entry", ("\u5df2\u6709\u7aef\u70b9" in home))
check("home carries the create modal", "create-modal" in home)

st, body, hdr = call("GET", "/api/stats")
check("stats answers in production", st == 200, "status=%s body=%s" % (st, body[:140]))
stats = json.loads(body or "{}") if st == 200 else {}
check("stats reports the self-measured shape",
      stats.get("ok") is True and stats.get("measured") == "self"
      and isinstance(stats.get("received"), int) and isinstance(stats.get("forwarded"), int)
      and set(stats.get("usage", {}).keys()) == {"requests", "d1_reads", "d1_writes"}, body[:140])
check("stats publishes the free-tier ceilings",
      stats.get("limits", {}).get("requests") == 100000
      and stats.get("limits", {}).get("d1_reads") == 5000000
      and stats.get("limits", {}).get("d1_writes") == 100000, str(stats.get("limits")))
check("stats stamps a UTC day", len(stats.get("day") or "") == 10 and stats["day"][4] == "-", str(stats.get("day")))
check("stats is cacheable for a minute", "max-age=60" in (hdr.get("Cache-Control") or ""), hdr.get("Cache-Control"))
check("stats leaks nothing about endpoints", "/hook/" not in body and PASSWORD not in body, body[:140])
check("home renders the stat strip", "stat-strip" in home and "st-workers-bar" in home and "st-d1-bar" in home)
check("the quota cells render as bars, not numbers", "class=\"stat-bar\"" in home and "renderQuota(" in home)

st, body, _ = call("POST", "/api/new", {"password": PASSWORD})
bin_id = json.loads(body).get("bin_id") if st == 200 else ""
check("endpoint creation works in production", st == 200 and len(bin_id) == 8, "status=%s body=%s" % (st, body[:120]))
print("endpoint:", bin_id)

st, body, _ = call("POST", "/hook/%s?token=%s" % (bin_id, urllib.parse.quote(PASSWORD)), b'{"event":"problem"}')
check("a push with the token is accepted", st == 200, body[:120])
check("a small push is not truncated", json.loads(body or "{}").get("truncated") is False, body[:120])

big = b"y" * (3 * 1024 * 1024)
st, body, _ = call("POST", "/hook/%s?token=%s" % (bin_id, urllib.parse.quote(PASSWORD)), big)
check("a 3 MB push survives the row limit", st == 200, body[:140])
check("the oversized push is flagged", json.loads(body or "{}").get("truncated") is True, body[:140])
check("the original size is reported", json.loads(body or "{}").get("original_bytes") == len(big), body[:140])

st, _, _ = call("POST", "/hook/%s?token=wrong-password" % bin_id, b"x")
check("a wrong token is rejected", st == 401, "status=%s" % st)

st, _, _ = call("GET", "/view/%s" % bin_id)
check("the console asks for a password", st == 401, "status=%s" % st)

st, _, h = call("POST", "/api/%s/login" % bin_id, "password=" + urllib.parse.quote(PASSWORD))
cookie = h.get("Set-Cookie", "").split(";")[0]
check("login issues a session", st == 303 and cookie.startswith("wh_" + bin_id + "="), "status=%s" % st)
check("the session cookie is HttpOnly", "HttpOnly" in (h.get("Set-Cookie") or ""))

auth = {"Cookie": cookie}
st, events, _ = call("GET", "/api/%s/events" % bin_id, headers=auth)
msgs = json.loads(events).get("messages", []) if st == 200 else []
check("the queue returns both pushes", len(msgs) == 2, "count=%s" % len(msgs))
small = next((m for m in msgs if (m.get("raw_body") or "").startswith('{"event"')), None)
check("the small payload is stored byte-for-byte", small is not None and small["raw_body"] == '{"event":"problem"}',
      repr((small or {}).get("raw_body")))
large = next((m for m in msgs if "已截断" in (m.get("raw_body") or "")), None)
check("the oversized payload is stored truncated", large is not None)
if large:
    stored_bytes = len(large["raw_body"].encode("utf-8"))
    check("the truncated row stays inside the budget", stored_bytes <= 1024 * 1024 + 200, "bytes=%s" % stored_bytes)
check("the push token is masked in the row", all((m.get("query_params") or "") == "?token=***" for m in msgs), str([m.get("query_params") for m in msgs]))
check("the plaintext password never lands in a row", all(PASSWORD not in json.dumps(m, ensure_ascii=False) for m in msgs))

st, listing, _ = call("GET", "/api/%s/forwarders" % bin_id, headers=auth)
limit = json.loads(listing).get("limit") if st == 200 else None
check("the forwarder ceiling is published", limit == 10, "limit=%s" % limit)

codes = [call("POST", "/api/%s/forwarders" % bin_id,
              {"name": "r%d" % i, "target_url": "https://example.com/r%d" % i, "forward_type": "raw"},
              headers=auth)[0] for i in range(11)]
check("ten rules are accepted", all(c == 200 for c in codes[:10]), str(codes))
check("the eleventh rule is refused", codes[10] == 400, "codes=%s" % codes)

st, body, _ = call("GET", "/api/exists?id=" + bin_id)
check("the lookup finds the endpoint", st == 200 and json.loads(body).get("exists") is True, body[:90])
st, body, _ = call("GET", "/api/exists?id=deadbeef")
check("the lookup reports a missing endpoint", st == 200 and json.loads(body).get("exists") is False, body[:90])

st, _, _ = call("POST", "/api/%s/destroy" % bin_id, None, auth)
check("the endpoint can be destroyed", st == 303, "status=%s" % st)
st, _, _ = call("POST", "/hook/%s?token=%s" % (bin_id, urllib.parse.quote(PASSWORD)), b"x")
check("the destroyed push endpoint is gone", st == 404, "status=%s" % st)
st, body, _ = call("GET", "/api/exists?id=" + bin_id)
check("the destroyed endpoint reports missing", json.loads(body).get("exists") is False, body[:90])

failed = [c for c in checks if not c[1]]
for name, ok, detail in checks:
    line = ("PASS  " if ok else "FAIL  ") + name
    if detail and not ok:
        line += "  [" + str(detail) + "]"
    print(line)
print("")
print(("ALL REMOTE CHECKS PASSED (%d)" % len(checks)) if not failed else ("%d REMOTE CHECK(S) FAILED" % len(failed)))
sys.exit(0 if not failed else 1)
