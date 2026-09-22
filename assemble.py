# -*- coding: utf-8 -*-
import io

base = r"D:\cf-webhook-bin"

with io.open(base + r"\part1.html", "r", encoding="utf-8") as f:
    home = f.read()
with io.open(base + r"\part2.html", "r", encoding="utf-8") as f:
    view = f.read()
with io.open(base + r"\part3.js", "r", encoding="utf-8") as f:
    worker = f.read()


def escape_for_template(s):
    s = s.replace("\\", "\\\\")
    s = s.replace("`", "\\`")
    s = s.replace("${", "\\${")
    return s


home_esc = escape_for_template(home)
view_esc = escape_for_template(view)

chunks = []
chunks.append("// Webhook Inspector & Multi-Channel Relay Hub")
chunks.append("// Front-end follows Apple Editorial Design Guidelines (DESIGN-apple.md)")
chunks.append("// Zero-emoji policy: every glyph on the page is a vector SVG icon")
chunks.append("")
chunks.append("const HOME_HTML_CONTENT = `" + home_esc + "`;")
chunks.append("")
chunks.append("const VIEW_HTML_CONTENT = `" + view_esc + "`;")
chunks.append("")
chunks.append(worker)

out = "\n".join(chunks)

with io.open(base + r"\src\index.js", "w", encoding="utf-8", newline="\n") as f:
    f.write(out)

print("assembled bytes:", len(out.encode("utf-8")))
print("home chars:", len(home))
print("view chars:", len(view))
print("worker chars:", len(worker))
