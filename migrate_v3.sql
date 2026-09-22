-- 增量升级：为已部署的库补上统计表（可重复执行）
-- 用法：npx wrangler d1 execute webhook_bin_db --remote --file=migrate_v3.sql

-- 累计量：全站单行计数表，记录从未清零的接收/转发总数
CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    received INTEGER NOT NULL DEFAULT 0,
    forwarded INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 每日用量：按 UTC 日切分，与 Cloudflare 免费额度的重置时间（00:00 UTC）对齐
CREATE TABLE IF NOT EXISTS daily_usage (
    day TEXT PRIMARY KEY,
    requests INTEGER NOT NULL DEFAULT 0,
    d1_reads INTEGER NOT NULL DEFAULT 0,
    d1_writes INTEGER NOT NULL DEFAULT 0
);
