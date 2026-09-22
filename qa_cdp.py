# -*- coding: utf-8 -*-
import base64, json, os, socket, struct, subprocess, time, urllib.request
from urllib.parse import urlparse

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9333
BIN = open(r"D:\cf-webhook-bin\qa_bin.txt").read().strip()
URL = "http://127.0.0.1:8787/view/" + BIN
OUT = r"D:\cf-webhook-bin\shots\view_detail.png"
PROFILE = r"D:\cf-webhook-bin\.chrome-qa"

proc = subprocess.Popen([
    CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--remote-debugging-port=%d" % PORT, "--window-size=1440,1380",
    "--user-data-dir=" + PROFILE, "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def wait_http(path, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen("http://127.0.0.1:%d%s" % (PORT, path), timeout=2) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            time.sleep(0.4)
    raise SystemExit("chrome devtools not reachable")

targets = wait_http("/json/list")
page = [t for t in targets if t.get("type") == "page"]
ws_url = page[0]["webSocketDebuggerUrl"]
print("target:", ws_url)

u = urlparse(ws_url)
sock = socket.create_connection((u.hostname, u.port), timeout=30)
key = base64.b64encode(os.urandom(16)).decode()
sock.sendall((
    "GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
    "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (u.path, u.hostname, u.port, key)
).encode())
buf = b""
while b"\r\n\r\n" not in buf:
    buf += sock.recv(4096)
print("handshake:", buf.split(b"\r\n")[0].decode())

def rd(n):
    b = b""
    while len(b) < n:
        c = sock.recv(n - len(b))
        if not c:
            raise EOFError("socket closed")
        b += c
    return b

def ws_send(text):
    data = text.encode("utf-8")
    hdr = bytearray([0x81])
    n = len(data)
    if n < 126:
        hdr.append(0x80 | n)
    elif n < 65536:
        hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
    else:
        hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
    mask = os.urandom(4)
    hdr += mask
    sock.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

def ws_recv():
    h = rd(2)
    opcode = h[0] & 0x0F
    masked = h[1] & 0x80
    ln = h[1] & 0x7F
    if ln == 126:
        ln = struct.unpack(">H", rd(2))[0]
    elif ln == 127:
        ln = struct.unpack(">Q", rd(8))[0]
    mk = rd(4) if masked else None
    pl = rd(ln)
    if masked:
        pl = bytes(b ^ mk[i % 4] for i, b in enumerate(pl))
    return opcode, pl

_mid = [0]
def cdp(method, params=None):
    _mid[0] += 1
    mine = _mid[0]
    ws_send(json.dumps({"id": mine, "method": method, "params": params or {}}))
    while True:
        op, pl = ws_recv()
        if op == 0x8:
            raise EOFError("ws closed")
        if op in (0x1, 0x2):
            msg = json.loads(pl.decode("utf-8", "replace"))
            if msg.get("id") == mine:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

def js(expr):
    r = cdp("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
    return r.get("result", {}).get("value")

cdp("Page.enable")
cdp("Runtime.enable")
cdp("Page.navigate", {"url": URL})

end = time.time() + 40
ready = False
while time.time() < end:
    try:
        n = js("document.querySelectorAll('.msg-row').length")
        if n and int(n) >= 3:
            ready = True
            break
    except Exception:
        pass
    time.sleep(0.6)
print("rows_loaded=", ready, "count=", js("document.querySelectorAll('.msg-row').length"))

# click the newest row (first in the stream) to render the detail pane
js("document.querySelector('.msg-row').click()")
time.sleep(1.5)

checks = {
    "detail_visible": js("getComputedStyle(document.getElementById('detail-box')).display"),
    "meta_rows": js("document.getElementById('d-meta').children.length"),
    "header_rows": js("document.querySelectorAll('#d-headers-table tr').length"),
    "raw_len": js("document.getElementById('d-raw').textContent.length"),
    "json_btn": js("document.getElementById('btn-toggle-json').textContent"),
    "time_label": js("document.getElementById('d-time').textContent"),
    "rows_after": js("document.querySelectorAll('.msg-row').length"),
}
for k, v in checks.items():
    print("check", k, "=", v)

# exercise the JSON pretty-print toggle
js("toggleFormat()")
time.sleep(0.6)
print("check json_toggled_btn =", js("document.getElementById('btn-toggle-json').textContent"))
print("check json_toggled_name =", js("document.getElementById('terminal-filename').textContent"))
print("check json_line_count =", len(str(js("document.getElementById('d-raw').textContent")).splitlines()))
print("check local_time_ok =", js("document.getElementById('d-time').textContent.indexOf('本地时间') > -1"))

shot = cdp("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
with open(OUT, "wb") as f:
    f.write(base64.b64decode(shot["data"]))
print("screenshot_bytes:", os.path.getsize(OUT))

sock.close()
proc.terminate()
