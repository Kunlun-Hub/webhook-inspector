# 部署与运维指南

本文是从零部署一份 **Webhook Inspector** 的完整步骤：本地开发、建库、发布、自检、升级、备份、排错。
只要最快上线，从 [第 1 步](#1-克隆并安装依赖) 顺序执行到 [第 6 步](#6-发布) 即可，约 5 分钟。

---

## 0. 先决条件

| 需要 | 说明 |
| --- | --- |
| Cloudflare 账号 | 免费计划即可，不用绑卡 |
| Node.js 18+ | 本机实测 v25.2.1；本项目锁定 wrangler 3.114.17 |
| Python 3（可选） | 只有跑 `verify_remote.py` 等自检脚本才需要 |
| Chrome（可选） | 只有跑浏览器级验收脚本（`qa_*.py`）才需要 |

**免费额度边界**（整个项目就跑在这些额度里）：

| 项目 | 免费额度 | 重置时间 |
| --- | --- | --- |
| Workers 请求 | 100,000 次 / 天 | UTC 00:00（北京时间 08:00） |
| Workers 子请求 | 每次调用 50 个 | 按调用 |
| 同时等待响应头的连接 | 每次调用 6 条 | 按调用 |
| D1 行读 | 5,000,000 行 / 天 | UTC 00:00（北京时间 08:00） |
| D1 行写 | 100,000 行 / 天 | UTC 00:00（北京时间 08:00） |
| D1 存储 | 5 GB | - |
| Cron Trigger | 每天 1 次（本项目只用了 1 条） | - |

---

## 1. 克隆并安装依赖

```powershell
git clone https://github.com/Kunlun-Hub/webhook-inspector.git
cd webhook-inspector
npm install
```

## 2. 登录 Cloudflare

```powershell
npx wrangler login
```

浏览器会弹出授权页，点 Allow。

## 3. 建 D1 数据库，并把 ID 填进 wrangler.toml

```powershell
npx wrangler d1 create webhook_bin_db
```

终端会输出：

```
database_name = "webhook_bin_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

打开 `wrangler.toml`，把 `database_id` 换成你自己的那一串：

```toml
name = "webhook-inspector"
main = "src/index.js"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "webhook_bin_db"
database_id = "把上一步输出的 ID 填在这里"

[triggers]
crons = ["0 19 * * *"]
```

> 仓库里的 `database_id` 是作者账号下的库，照抄会读写到别的账号（实际会直接报找不到数据库）。
> `name` 也要留意：同一个账号下不能有两个同名 Worker，重名就改成别的名字。

## 4. 建表

```powershell
npx wrangler d1 execute webhook_bin_db --remote --file=schema.sql
```

`schema.sql` 是完整建表脚本（可重复执行），共 5 张表：

| 表 | 用途 |
| --- | --- |
| `bins` | 端点：ID、加盐密码哈希、创建时间、最后活跃时间 |
| `messages` | 报文：Method / Header / Query / Body 原文与转发回执 |
| `forwarders` | 转发规则：目标地址、渠道类型 |
| `stats` | 全站累计接收 / 转发量（首页统计条） |
| `daily_usage` | 当日请求数、D1 读写行数（首页额度进度条） |

**已部署过、只是升级**（库里已有数据就不要重跑 `schema.sql`，只跑缺的增量脚本）：

```powershell
npx wrangler d1 execute webhook_bin_db --remote --file=migrate_v2.sql  # 老库补 salt / token_hash 字段
npx wrangler d1 execute webhook_bin_db --remote --file=migrate_v3.sql  # 补统计表（缺它 /api/stats 会 500）
```

## 5. 发布

```powershell
npx wrangler deploy
```

看到 `Uploaded webhook-inspector` 与 `Current Version ID` 即成功，控制台会给出访问地址：

```
https://webhook-inspector.<你的子域>.workers.dev
```

同时会注册 Cron Trigger `0 19 * * *`（UTC 19:00 = 北京时间 03:00），每天清理 3 天未活动的端点，连同它的报文与转发规则。

## 6. 部署后自检

```powershell
python verify_remote.py https://webhook-inspector.<你的子域>.workers.dev
```

36 项检查：首页与统计接口、建端点、推小报文、推 3 MB 报文（验证截断与标注）、错误令牌被拒、控制台鉴权、转发规则上限、端点存在性查询、注销端点，收尾会自动删掉测试端点。

只想手工看一眼：

```powershell
curl -A "Zabbix/6.4.0" https://<你的地址>/api/stats
```

## 7. 本地开发

```powershell
npx wrangler dev --port 8787
```

打开 <http://127.0.0.1:8787>。本地 D1 数据落在 `.wrangler/`（已在 `.gitignore` 里），与线上库完全隔离。

**改前端必须重新拼装**：`src/index.js` 是产物，不要直接编辑。

```powershell
python assemble.py     # part1.html + part2.html + part3.js -> src/index.js
npx wrangler deploy    # 部署的就是 src/index.js
```

| 源文件 | 内容 |
| --- | --- |
| `part1.html` | 首页：统计条、主标题、四张能力卡、创建 / 已有端点弹窗 |
| `part2.html` | 端点控制台：接收队列、报文透视、转发规则、锁定 / 注销 |
| `part3.js` | Worker 路由、密码哈希、11 个渠道适配器、用量计量、cron 自毁 |

## 8. 自测脚本（可选）

| 脚本 | 作用 | 依赖 |
| --- | --- | --- |
| `verify_ui.mjs` | 静态检查：Worker 模块语法、首页 / 控制台关键接线、无投影无 Emoji | Node |
| `verify_api.py` | 接口级：建端点、鉴权、入库截断、各渠道适配、统计接口、注销 | Python + 本地 dev server |
| `qa_features.py` | 浏览器级：首页一屏、统计条渲染与阈值、渠道提示、注销全链路 | Python + Chrome |
| `qa_auth.py` | 浏览器级：创建弹窗、密码校验、控制台登录 / 锁定 / 找回 | Python + Chrome |
| `verify_remote.py` | 生产冒烟：对已部署地址跑全链路（36 项） | Python |
| `local_check.py` | 一把梭自检：首页 / 建端点 / 鉴权 / 推送 / 读取 | Python + 本地 dev server |
| `cdp.py` | 上面浏览器脚本用的无依赖 Chrome DevTools Protocol 驱动 | Python + Chrome |

```powershell
node verify_ui.mjs          # 需要先 python assemble.py
python verify_api.py        # 需要先 npx wrangler dev --port 8787
python qa_features.py
python qa_auth.py
```

> 这些脚本是本机自测用的，内部把项目路径写死成 `D:\cf-webhook-bin`（`cdp.py` 的 `SHOTS`、`qa_*.py` 的 `sys.path`）。克隆到别的目录时，改这几行即可；只做部署不必跑它们。

## 9. 自定义域名（可选）

Cloudflare 控制台 → Workers & Pages → `webhook-inspector` → Settings → Domains & Routes → Add → Custom domain。
要求域名已托管在同一个 Cloudflare 账号下。加完等证书签发（通常 1 分钟内）即可通过自己的域名访问。

## 10. 升级已有部署

```powershell
git pull
python assemble.py                                          # 只有改了 part*.html / part3.js 才需要
npx wrangler d1 execute webhook_bin_db --remote --file=migrate_v3.sql   # 按需
npx wrangler deploy
python verify_remote.py https://<你的地址>
```

## 11. 备份与回滚

```powershell
npx wrangler d1 export webhook_bin_db --remote --output backup.sql   # 导出全库（结构 + 数据）
npx wrangler rollback                                                # 回滚到上一个部署版本
npx wrangler deployments list                                        # 看版本历史
```

端点 3 天不用就会被物理删除，报文不必长期留档；真要留就定期 `d1 export`。

## 12. 代理环境（国内网络常见）

wrangler 走 Node 的 fetch，**不读 Windows 系统代理**，必须显式给环境变量：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:10808'
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:NO_PROXY='localhost,127.0.0.1'
npx wrangler deploy
```

git 同理，临时走一次代理即可：

```powershell
git -c http.proxy=http://127.0.0.1:10808 push
```

`python verify_remote.py` 用 urllib，会自动读 `HTTPS_PROXY` / `HTTP_PROXY`，不用额外设置。

## 13. 排错

| 现象 | 原因与处理 |
| --- | --- |
| `403 error code 1010` | Cloudflare 按 UA 拦爬虫，`Python-urllib` 会被拦。脚本要显式带 `User-Agent`（`Zabbix/6.4.0`、`curl/8.x`、浏览器 UA 都行） |
| `/api/stats` 返回 500 | 缺统计表，跑 `migrate_v3.sql` 后再刷新 |
| 首页额度百分比长时间不动 | 自计口径：计数先在内存攒批、最多 20 秒落一次库，页面再叠 60 秒缓存。超过几分钟不变再去查 |
| 推送响应里 `truncated: true` | 单条入库上限 1 MB（D1 单行 2 MB），超出按 UTF-8 字符边界截断，响应给出 `original_bytes`；出站转发仍使用完整原文 |
| 端点突然 404 | 3 天无活动被 cron 物理自毁，不可恢复，只能重建 |
| 转发没送到 | 控制台每条报文下记录每次转发的 `[ok]` / `[bad]` 与 HTTP 状态；401/404 多为对方 token 或地址写错 |
| `fetch failed` / `UND_ERR_CONNECT_TIMEOUT` | 代理没设，见上一节 |
| 迁移脚本报 `Not currently importing anything` | wrangler 的已知噪声。先确认表建好没：`npx wrangler d1 execute webhook_bin_db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"` |
| `wrangler deploy` 问 "last published via the Cloudflare Dashboard" | 之前在网页端改过这个 Worker，选 yes 用本地代码覆盖即可 |

## 14. 安全与隐私须知

- 仓库里没有任何密钥：Worker 不需要 API Token，端点鉴权用的是每个端点自己的密码，服务端只存加盐 SHA-256。
- 这个密码同时是控制台登录凭据和推送令牌，泄露等于把端点交出去；控制台默认只显示不带令牌的 `/hook/<id>`，点「拷贝地址」才写入完整地址。
- 报文入库前会把 `token` 查询参数、`X-Webhook-Token`、`Authorization` 请求头替换成 `***`。
- 站点是公开可访问的：知道端点 ID 就能往里推（需要令牌才收），知道 ID 就能打开控制台（需要密码才看得到内容）。别把它当长期敏感数据仓库，用完注销端点。
