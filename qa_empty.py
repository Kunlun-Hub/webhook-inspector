import json, subprocess, sys, urllib.request
sys.path.insert(0, r"D:\cf-webhook-bin")
from cdp import Chrome

req = urllib.request.Request("http://127.0.0.1:8787/api/new",
                             data=json.dumps({"password": "Empty-State-2026"}).encode(),
                             headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=15) as r:
    bin_id = json.loads(r.read().decode())["bin_id"]
print("fresh endpoint:", bin_id)

c = Chrome(port=9337, width=1440, height=900, profile=r"D:\cf-webhook-bin\.chrome-qa-empty")
c.goto("http://127.0.0.1:8787/view/" + bin_id)
c.wait_for("document.querySelector('#hook-url') !== null")
c.js("document.getElementById('p').value='Empty-State-2026'")
# click the button so the page's onsubmit stash actually runs (form.submit() bypasses it)
c.js("document.querySelector('form button[type=submit]').click()")
c.wait_for("document.querySelector('#token-note') !== null", timeout=20)
print("token note:", c.js("document.getElementById('token-note').innerText"))
print("curl:", c.js("document.getElementById('curl-cmd').innerText"))
p, s = c.shot("view_empty.png", full=True)
print("view_empty.png", s, "bytes")
try:
    c.close()
finally:
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(c.proc.pid)], capture_output=True)
