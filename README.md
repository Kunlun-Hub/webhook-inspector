# Cloudflare Webhook 接收与智能转发站 (Webhook Inspector)

> 线上地址：<https://webhook-inspector.kfc4008208820.workers.dev>（Cloudflare Worker + D1，部署在免费额度内）

这是一个跑在 Cloudflare 边缘的轻量 Webhook 调试、查看与转发工具。

## 功能特性
1. **动态端点生成 + 知情同意**：点击「创建端点」先阅读免责声明，并为本端点设置一个访问密码，提交后生成专属随机 Webhook 端点。
2. **记住端点 ID 就能回来**：首页「已有端点」入口接受 8 位端点 ID，也接受直接粘贴整条推送地址；确认端点存在后跳转到对应控制台，输入密码即可查看。ID 不存在时当场提示「没有此端点」，不会把人带到一个空白页面。
3. **密码保护控制台 + 令牌校验推送**：同一个密码既用于登录 Web 控制台，也作为第三方系统推送时的身份令牌。控制台与查询接口全部需要会话 Cookie，推送接口需要令牌，未授权请求一律拒绝。
4. **原样报文展示**：完整记录 Method、Header、Query 及 Body 原文，支持 JSON 一键格式化与复制。单条报文入库上限 1 MB，超出部分截断并标注原始字节数（转发仍用未截断的原文）。
5. **多目标智能转发**：内置 10 种渠道的消息格式适配，可同时推给多个目标，或原样透传到自定义 Webhook，每个端点最多 10 条规则（受免费版每次调用 50 个子请求的硬上限约束）。

   | 分组 | 渠道 |
   | --- | --- |
   | 群机器人 | 企业微信、钉钉、飞书、Telegram、Discord、Slack（Mattermost / Rocket.Chat 的 Slack 兼容入口同样可用） |
   | 推送渠道 | ntfy、Bark、Gotify、Server 酱 |
   | 通用 | 原样透传（不做任何封装，POST 原始报文） |

   每个渠道按各自的接口约定组装正文与 Content-Type（JSON / 纯文本 / 表单），并按其长度上限截断。
6. **3 天无活动自动焚毁**：配置了每日 Cron Trigger 自动物理抹除超过 3 天未活动的端点、历史消息及转发规则。
7. **完全免费**：使用 Cloudflare Worker + D1 免费额度（每天 10 万次写入，500 万次读取）。
8. **首页统计条**：首页顶部给出已接收消息数、已转发投递数；当日剩余额度（Workers 请求、D1 写入）只用**进度条 + 百分比**表示，不对外暴露具体用量数字；剩余低于 20% 转琥珀、低于 5% 转红。数据由本站自计（Cloudflare 不向 Worker 暴露账号级用量），约 1 分钟内更新；额度按 UTC 日重置，即北京时间每天 08:00 归零。

---

## 前端源码结构

页面不再直接手写在 `src/index.js` 里。`src/index.js` 由以下三份可独立编辑的源码拼装而成：

| 文件 | 作用 |
| --- | --- |
| `part1.html` | 首页（统计条、服务介绍、创建 / 已有端点弹窗） |
| `part2.html` | 端点控制台（实时接收队列、报文透视、群转发配置弹窗、锁定控制台） |
| `part3.js` | Worker 路由、各平台机器人消息适配器、定时清理任务 |
| `assemble.py` | 拼装脚本，产出 `src/index.js` |
| `cdp.py` | 本地 QA 用的 Chrome DevTools Protocol 驱动，无第三方依赖 |
| `qa_auth.py` | 浏览器级验收：创建弹窗、密码校验、控制台登录/锁定、令牌推送全链路 |
| `qa_shots.py` | 重新抓取创建弹窗的三种状态截图（默认 / 已滚动 / 校验报错） |
| `qa_features.py` | 浏览器级验收：首页单行主标题、首页统计条渲染与口径、渠道切换提示、注销端点全链路、已有端点找回全链路、转发规则配额 |
| `verify_remote.py` | 生产冒烟测试：对已部署的 Worker 跑完整链路（28 项），不依赖本地服务 |
| `local_check.py` | 本地前后端连通自检（首页 / 建端点 / 鉴权 / 推送 / 读取一次跑完） |

修改任意一份源码后，重新拼装并校验：

```powershell
cd D:\cf-webhook-bin
python assemble.py          # 产出 src/index.js
node verify_ui.mjs          # 页面结构 / 占位符 / 无 Emoji / 无多余阴影 校验
python verify_api.py        # 需先启动 npx wrangler dev，校验接收、鉴权与转发接口
python qa_auth.py           # 需先启动 npx wrangler dev，真浏览器跑一遍创建与登录流程
python qa_features.py       # 同上，验收首页改版、推送渠道与注销端点
python local_check.py       # 同上，快速确认前后端是否都活着
```

> `qa_auth.py` / `qa_shots.py` 会调用本机 Chrome 做无头验收，并把截图写入 `shots\`。

> 注意：`assemble.py` 会把 HTML 中的反引号、`${...}`、反斜杠转义后再写入模板字符串，
> 因此请勿直接编辑 `src/index.js` 中的页面内容，改完 `part*.html` 重新拼装即可。

### 访问控制与令牌

设置密码时页面上给出的约定，实现上完全按此执行：

| 事项 | 实现 |
| --- | --- |
| 密码的两个用途 | ① 登录 `/view/<id>` 控制台；② 作为 `/hook/<id>` 的推送令牌 |
| 服务端存储 | 只存 `salt` + `token_hash`（加盐 SHA-256），从不保存明文 |
| 密码强度 | 最少 8 位，创建与登录两侧都会校验 |
| 控制台会话 | HttpOnly + SameSite=Lax 的 `wh_<id>` Cookie，有效期 12 小时；HTTPS 下自动带 `Secure` |
| 推送令牌 | 地址追加 `?token=<密码>`，或请求头 `X-Webhook-Token: <密码>`；两者都支持 |
| 越权隔离 | 一个端点的会话 Cookie 无法打开另一个端点 |
| 防止二次泄露 | 报文入库前会把 `token` 查询参数、`X-Webhook-Token` 与 `Authorization` 请求头替换为 `***`，控制台里也看不到明文 |
| 控制台展示 | 页面上始终只显示不含令牌的 `/hook/<id>`，点「拷贝地址」才写入带令牌的完整地址，避免截图、投屏时连带泄露 |
| 主动锁定 | 控制台「锁定控制台」按钮清除会话 Cookie 与本机缓存令牌，回到密码页 |
| 注销端点 | 控制台「注销端点」按钮二次确认后，永久删除该端点及其全部报文与转发规则，推送地址立即失效 |
| 已有端点找回 | 首页「已有端点」入口先调 `/api/exists?id=<id>` 判断端点是否还存在（无需登录，只回 `exists` 真假，不泄露任何内容）；不存在当场提示，存在才跳转 `/view/<id>`，仍需密码才能看到报文 |

升级说明：如果你在引入访问控制之前已经建过表，需要补两个字段（全新部署直接用 `schema.sql`，无需执行）：

```powershell
npx wrangler d1 execute webhook_bin_db --remote --file=migrate_v2.sql
```

历史遗留的端点因为没有 `token_hash`，会被永久锁在门外，如仍需要请重新创建。

### 接口一览

| 方法与路径 | 鉴权 | 作用 |
| --- | --- | --- |
| `GET /` | 无 | 首页：服务介绍、创建端点、已有端点入口 |
| `GET /api/exists?id=<id>` | 无 | 只回答端点是否还存在，供首页「已有端点」入口调用；响应仅 `{ ok, exists }`，不返回任何端点内容 |
| `GET /api/stats` | 无 | 首页统计条用：累计接收 / 转发量、当日请求与 D1 读写用量、免费额度上限。只是一组计数，不含任何端点信息；`Cache-Control: public, max-age=60` |
| `POST /api/new` | 无 | 创建端点（表单：访问密码 + 免责勾选），返回 `bin_id` 并下发会话 Cookie |
| `POST /api/<id>/login` | 密码 | 校验密码，换发 HttpOnly 会话 Cookie |
| `POST /api/<id>/logout` | 会话 | 清除会话 Cookie |
| `POST /api/<id>/destroy` | 会话 | 注销端点，连同全部报文与转发规则一并物理删除 |
| `GET /view/<id>` | 会话 | 端点控制台页面；未登录 / 会话过期时返回密码页 |
| `GET /api/<id>/events` | 会话 | 拉取最近 50 条接收队列 |
| `POST /api/<id>/clear` | 会话 | 清空该端点的报文 |
| `GET /api/<id>/forwarders` | 会话 | 列出转发规则，并返回上限 `limit` |
| `POST /api/<id>/forwarders` | 会话 | 新增转发规则；每端点上限 10 条，超出返回 400 `forwarder limit reached` |
| `DELETE /api/<id>/forwarders/<n>` | 会话 | 删除某条转发规则 |
| `POST /hook/<id>?token=<密码>` | 推送令牌 | Webhook 接收主入口：原样入库并按规则转发；原文超过 1 MB 会截断入库，响应带 `truncated` / `original_bytes` |

推送地址也可改用请求头 `X-Webhook-Token: <密码>` 传令牌，效果与查询参数一致。
### 免费版配额边界

Worker 免费版每次调用只有 50 个子请求（免费账号上限就是 50，调不高），本项目这样分配：

| 环节 | 每次调用消耗 | 说明 |
| --- | --- | --- |
| 收报文 | 5 次 D1 | 查端点、写报文、更新活跃时间；转发前查规则、回写转发日志 |
| 转发 | 最多 10 次 fetch | 由「每端点 10 条规则」的上限封顶 |
| 合计 | ≤ 15 | 距离 50 的天花板有 3 倍余量 |

- **入库收敛**：D1 单行上限 2 MB，因此报文原文超过 1 MB 会按 UTF-8 字节截断入库（截断点回退到完整字符边界，不会出现半个汉字），并在末尾标注原始字节数；出站转发仍使用未截断的原文。
- **并发连接**：同时等待响应头的连接上限是 6 条，超出的 fetch 由运行时排队而不是失败，只是整体变慢。
- **轮询成本**：控制台每 2.5 秒拉一次队列，一个标签页挂满 24 小时约 3.46 万次请求，占免费额度（10 万次/天）约三分之一。

### 首页统计条与自计口径

Cloudflare **不向 Worker 暴露账号级用量**（请求 `/api/stats` 拿不到账号剩余额度），因此统计条的数字由 Worker 自己记账。`/api/stats` 本身仍然返回带原始数的 JSON，只是首页只把额度渲染成百分比：

| 数字 | 口径 |
| --- | --- |
| 已接收消息 | 全站累计成功入库的报文条数（`stats.received`）；从上线那一刻起累加，注销端点清空报文也不会让它回退 |
| 已转发投递 | 只统计真正送到目标的投递（HTTP 2xx）；4xx/5xx、超时、目标已注销都不计入 |
| 今日 Workers 请求余量 | `100000 - 当日请求数`；每次进来的请求（含 cron 调用）记 1 次，出站 fetch 不计 |
| 今日 D1 写入余量 | `100000 - 当日写入行数`；按 D1 返回的 `meta.rows_written` 累加 |
| 进度条 | 长度 = 当日剩余占比（满条 = 额度未动），文字只给百分比；剩余 <20% 转琥珀、<5% 转红 |

- **重置时间**：Workers 与 D1 的免费额度都按 **UTC 00:00 重置，即北京时间每天 08:00**；统计条与之对齐（`daily_usage.day` 存的就是 UTC 日期）。不是北京时间午夜归零。
- **写放大与攒批**：计数如果逐请求落库，光一个挂满 24 小时的控制台标签页（每 2.5 秒轮询 ≈ 3.46 万次请求）就能吃掉免费写入额度的一半以上。所以计数先在 isolate 内存里攒批，**最多 20 秒落一次库**，收到报文时立即结算，因此首页数字最多滞后约 20 秒（再叠加页面自带的 60 秒缓存）。
- **免费额度参考**（Cloudflare 免费计划）：Workers 每天 10 万次请求；D1 每天 500 万行读、10 万行写、5 GB 总存储。
- **口径偏差**：`first()` / `raw()` 不返回 D1 元数据，按「至少读 1 行」估算；计数自身的落库语句也算 1 行写入。这是自计口径，与 Cloudflare 账单数字会有个位数出入。

### 设计规范

页面遵循 Apple 编辑式设计规范：
- 主色 `#0066cc`，悬停 `#0071e3`，墨色文字 `#1d1d1f`，羊皮纸底色 `#f5f5f7`。
- 标题字重 600、负字距；正文 17px / 行高 1.47。
- 圆角只用三档：胶囊 `9999px`、卡片 `18px`、小标签 `8px`。
- **界面本身不使用投影**，弹窗与卡片一律靠 1px 细线与背景模糊分层；唯一例外是接收队列中「实时监听」绿点的状态光晕。
- 全站不使用 Emoji，所有图形均为内联矢量 SVG 图标；站点标识为 `<--` / `-->` 双向箭头。
- **下拉选择器为自定义实现**（`.picker-*`，见 `part2.html`）：原生 `<select>` 的展开面板由操作系统绘制，CSS 无法干预，风格必然脱离设计规范。自定义面板挂在 `document.body` 上做 `position: fixed` 定位（弹窗是 `overflow:hidden`，挂在里面会被裁掉），支持方向键 / Home / End / Enter / Esc / 首字母快跳、点击外部关闭，空间不足时自动限高并向上翻转。表单契约不变：仍然读写隐藏字段 `#f-type`。

---
## 部署上线步骤（只需两步）

### 第一步：在终端中登录 Cloudflare
打开 PowerShell，进入本目录：
```powershell
cd D:\cf-webhook-bin
npx wrangler login
```
*浏览器会自动弹窗，点击“Allow / 授权”完成登录。*

### 第二步：一键创建远程 D1 数据库并部署
依次执行以下命令：

1. **创建远程 D1 数据库**：
   ```powershell
   npx wrangler d1 create webhook_bin_db
   ```
   *终端会输出类似下面的内容：*
   ```
   database_name = "webhook_bin_db"
   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
2. **把上面的 `database_id` 填入 `wrangler.toml`**：
   打开 `D:\cf-webhook-bin\wrangler.toml`，将 `PLACEHOLDER_DATABASE_ID` 替换为真实的 ID。

3. **在远程数据库执行建表 SQL**：
   ```powershell
   npx wrangler d1 execute webhook_bin_db --remote --file=schema.sql
   ```
   > 已经跑着的实例不用重建库：报文字段升级跑 `--file=migrate_v2.sql`，统计表跑 `--file=migrate_v3.sql`（两者都可重复执行）。统计表没建就访问 `/api/stats` 会直接 500，先跑迁移再发布。

4. **一键发布上线**：
   ```powershell
   npx wrangler deploy
   ```
   *发布完成后，控制台会给出公网访问网址，例如：`https://webhook-inspector.<你的子域>.workers.dev`*

### 当前部署

| 项目 | 值 |
| --- | --- |
| Worker 地址 | `https://webhook-inspector.kfc4008208820.workers.dev` |
| Worker 名称 | `webhook-inspector` |
| D1 数据库 | `webhook_bin_db` / `6a7f285a-55ec-4616-aee3-7886ae458fb7`（APAC / NRT） |
| 定时任务 | `0 19 * * *`（北京 03:00，清理 3 天未活动的端点） |
| 上传体积 | 121.00 KiB（gzip 29.14 KiB） |
| 当前版本 | `d2d28567-b3dd-47df-9617-b9da53806443`（2026-09-22，首页额度改为进度条 + 百分比） |
| 首次部署版本 | `57b5548d-0c6f-49ca-b30a-341fc41e5825` |

上线后跑一次生产冒烟测试（会自建端点、验证全链路、最后自动注销该端点）：

```powershell
python verify_remote.py
```

### 线上才暴露的坑：Cloudflare 的浏览器签名拦截

`*.workers.dev` 会按浏览器签名拦截被判定为爬虫的 User-Agent。实测用 Python 的 `urllib`（UA 为 `Python-urllib/3.x`）请求会直接吃 **403 error 1010**，请求在边缘就被拦掉，根本进不到 Worker；`curl/8.x`、`Zabbix/6.4`、浏览器 UA 与空 UA 均正常放行，**Zabbix 的 Webhook 推送不受影响**。自己写脚本对接时记得显式设置 `User-Agent`（`verify_remote.py` 用的就是 `Zabbix/6.4.0`）。

### 代理环境注意

wrangler 走 Node 的 fetch，**不读 Windows 系统代理**。如果本机是通过 `127.0.0.1:10808` 之类的代理上网，部署前需要显式带上环境变量，否则会报 `fetch failed`（`UND_ERR_CONNECT_TIMEOUT`）：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:10808'
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:NO_PROXY='localhost,127.0.0.1'
npx wrangler deploy
```

---

## 本地开发/离线测试
如果你想在本地继续调试，直接运行：
```powershell
cd D:\cf-webhook-bin
npx wrangler dev
```
打开 `http://127.0.0.1:8787` 即可体验全部功能。