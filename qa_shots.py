import os, subprocess, sys, time
sys.path.insert(0, r"D:\cf-webhook-bin")
from cdp import Chrome
prof = r"D:\cf-webhook-bin\.chrome-qa-shots"
c = Chrome(port=9336, width=1440, height=900, profile=prof)
c.goto("http://127.0.0.1:8787/")
c.wait_for("document.readyState === 'complete'")
c.js("document.querySelector('.nav-cta').click()")
c.wait_for("document.getElementById('create-modal').classList.contains('show')")
sc = "document.querySelector('.sheet-scroll')"
print("read area: scrollHeight=%s clientHeight=%s" % (c.js(sc + ".scrollHeight"), c.js(sc + ".clientHeight")))
c.js(sc + ".scrollTop = 99999")
print("scrolled_to=", c.js(sc + ".scrollTop"))
print("disclaimer visible when scrolled:", c.js("document.querySelector('.legal-box').getBoundingClientRect().top < window.innerHeight - 60"))
p, s = c.shot("create_modal_disclaimer.png")
print("create_modal_disclaimer.png", s, "bytes")
c.js(sc + ".scrollTop = 0;"
     "document.getElementById('pwd').value='short';document.getElementById('pwd2').value='short';"
     "document.getElementById('agree').checked=true;document.querySelector('#create-form button[type=submit]').click();")
print("err=", c.js("document.getElementById('modal-err').textContent"))
p, s = c.shot("create_modal_error.png")
print("create_modal_error.png", s, "bytes")
try:
    c.close()
finally:
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(c.proc.pid)], capture_output=True)
