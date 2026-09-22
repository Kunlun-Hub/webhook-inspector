-- 端点表（3 天未活跃自动销毁）
-- salt / token_hash：创建端点时设置的访问密码，同时用于 Web 控制台登录与推送令牌校验。
-- 数据库仅保存 加盐 SHA-256 哈希，不保存明文密码。
CREATE TABLE IF NOT EXISTS bins (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    salt TEXT,
    token_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息记录表（逐字保存原文）
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bin_id TEXT NOT NULL,
    method TEXT NOT NULL,
    client_ip TEXT,
    headers TEXT,
    query_params TEXT,
    raw_body TEXT,
    forward_logs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bin_id) REFERENCES bins(id) ON DELETE CASCADE
);

-- 转发器规则表
CREATE TABLE IF NOT EXISTS forwarders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    forward_type TEXT NOT NULL, -- 'raw', 'wecom', 'dingtalk', 'feishu'
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bin_id) REFERENCES bins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_bin ON messages(bin_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_bins_active ON bins(last_active);

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
