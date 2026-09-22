# -*- coding: utf-8 -*-
"""本地前后端连通自检（需先启动 npx wrangler dev --port 8787）"""
import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8787"
PASSWORD = "Local-Run-2026"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def req(method, path, body=None, headers=None):
    h = dict(headers or {})
    data = None
    if isinstance(body, str):
        data = body.encode()
        h["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"
    elif body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(r, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), dict(e.headers)


s, b, _ = req("GET", "/")
print("前端  GET  /                    -> %s  (%d bytes)" % (s, len(b)))

s, b, h = req("POST", "/api/new", {"password": PASSWORD})
bid = json.loads(b).get("bin_id") if s == 200 else ""
print("后端  POST /api/new             -> %s  bin=%s" % (s, bid))

print("鉴权  GET  /view/<id>  无会话   -> %s  (401 = 密码页)" % req("GET", "/view/" + bid)[0])
print("鉴权  POST /hook/<id>  无令牌   -> %s  (401 = 拒绝)" % req("POST", "/hook/" + bid, {"a": 1})[0])
s, b, _ = req("GET", "/api/exists?id=" + bid)
print("入口  GET  /api/exists   真 id  -> %s  exists=%s" % (s, json.loads(b).get("exists")))
s, b, _ = req("GET", "/api/exists?id=deadbeef")
print("入口  GET  /api/exists   假 id  -> %s  exists=%s" % (s, json.loads(b).get("exists")))

s, _, h = req("POST", "/api/" + bid + "/login", "password=" + urllib.parse.quote(PASSWORD))
cookie = h.get("Set-Cookie", "").split(";")[0]
print("后端  POST /api/<id>/login      -> %s  cookie=%s..." % (s, cookie[:22]))

s, _, _ = req("POST", "/hook/" + bid + "?token=" + urllib.parse.quote(PASSWORD),
              {"event": "problem", "severity": "High", "host": "web-01"})
print("后端  POST /hook/<id>  带令牌   -> %s" % s)

s, b, _ = req("GET", "/api/" + bid + "/events", headers={"Cookie": cookie})
msgs = json.loads(b).get("messages", [])
print("后端  GET  /api/<id>/events     -> %s  队列 %d 条" % (s, len(msgs)))
if msgs:
    print("      原文: %s" % msgs[0]["raw_body"])
    print("      查询: %s  (令牌应已打码)" % (msgs[0]["query_params"] or "(空)"))

print("")
print("首页   : http://127.0.0.1:8787/")
print("控制台 : http://127.0.0.1:8787/view/%s" % bid)
print("密码   : %s" % PASSWORD)
