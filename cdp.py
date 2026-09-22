# -*- coding: utf-8 -*-
"""Minimal Chrome DevTools Protocol driver over a raw websocket.

Used by the local QA scripts; no third-party dependencies.
"""
import base64
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request
from urllib.parse import urlparse

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = r"D:\cf-webhook-bin\shots"


class Chrome(object):
    def __init__(self, port=9334, width=1440, height=900, profile=r"D:\cf-webhook-bin\.chrome-qa"):
        self.proc = subprocess.Popen([
            CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
            "--remote-debugging-port=%d" % port, "--window-size=%d,%d" % (width, height),
            "--user-data-dir=" + profile, "about:blank"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = self._wait_for_target(port)
        self._connect(ws_url)
        self.cdp("Page.enable")
        self.cdp("Runtime.enable")

    def _wait_for_target(self, port, timeout=40):
        end = time.time() + timeout
        while time.time() < end:
            try:
                with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % port, timeout=2) as r:
                    pages = [t for t in json.loads(r.read().decode("utf-8")) if t.get("type") == "page"]
                if pages:
                    return pages[0]["webSocketDebuggerUrl"]
            except Exception:
                pass
            time.sleep(0.4)
        raise SystemExit("chrome devtools not reachable on port %d" % port)

    def _connect(self, ws_url):
        u = urlparse(ws_url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((
            "GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (u.path, u.hostname, u.port, key)
        ).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.sock.recv(4096)
        self.mid = 0

    def _rd(self, n):
        b = b""
        while len(b) < n:
            c = self.sock.recv(n - len(b))
            if not c:
                raise EOFError("socket closed")
            b += c
        return b

    def _send(self, text):
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
        self.sock.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _recv(self):
        h = self._rd(2)
        op = h[0] & 0x0F
        masked = h[1] & 0x80
        ln = h[1] & 0x7F
        if ln == 126:
            ln = struct.unpack(">H", self._rd(2))[0]
        elif ln == 127:
            ln = struct.unpack(">Q", self._rd(8))[0]
        mk = self._rd(4) if masked else None
        pl = self._rd(ln)
        if masked:
            pl = bytes(b ^ mk[i % 4] for i, b in enumerate(pl))
        return op, pl

    def cdp(self, method, params=None):
        self.mid += 1
        mine = self.mid
        self._send(json.dumps({"id": mine, "method": method, "params": params or {}}))
        while True:
            op, pl = self._recv()
            if op == 0x8:
                raise EOFError("websocket closed")
            if op in (0x1, 0x2):
                msg = json.loads(pl.decode("utf-8", "replace"))
                if msg.get("id") == mine:
                    if "error" in msg:
                        raise RuntimeError(msg["error"])
                    return msg.get("result", {})

    def js(self, expr):
        r = self.cdp("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        res = r.get("result", {})
        if res.get("subtype") == "error":
            raise RuntimeError(res.get("description"))
        return res.get("value")

    def goto(self, url, timeout=40):
        self.cdp("Page.navigate", {"url": url})
        end = time.time() + timeout
        while time.time() < end:
            try:
                if self.js("document.readyState") == "complete":
                    return True
            except Exception:
                pass
            time.sleep(0.3)
        return False

    def wait_for(self, expr, timeout=40, interval=0.4):
        end = time.time() + timeout
        while time.time() < end:
            try:
                if self.js(expr):
                    return True
            except Exception:
                pass
            time.sleep(interval)
        return False

    def shot(self, name, full=False):
        if not os.path.isdir(SHOTS):
            os.makedirs(SHOTS)
        data = self.cdp("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": bool(full)})
        path = os.path.join(SHOTS, name)
        with open(path, "wb") as f:
            f.write(base64.b64decode(data["data"]))
        return path, os.path.getsize(path)

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass
        # headless chrome spawns a helper tree; terminate the whole thing
        # so the user-data-dir lock is released for the next run
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.proc.pid)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            self.proc.wait(timeout=10)
        except Exception:
            pass
