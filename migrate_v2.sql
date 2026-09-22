-- 仅当你在此版本之前就已经创建过 bins 表时才需要执行本文件。
-- 全新部署请直接使用 schema.sql，无需执行这里的内容。

ALTER TABLE bins ADD COLUMN salt TEXT;
ALTER TABLE bins ADD COLUMN token_hash TEXT;
